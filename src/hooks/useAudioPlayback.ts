import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioBriefing, AudioInterruptionPoint } from '../types';
import type { Flashcard } from '../services/aiPrompting';
import { useAudioPlayer } from './useAudioPlayer';
import { fetchVoiceAudio, InsufficientCreditsError } from '../services/voiceTTS';
import { briefingLibrary } from '../services/briefingLibrary';
import type { FlareState } from '../components/SolarFlare';

/**
 * On a fresh briefing we use the LLM-chosen interruption points as-is.
 * On a re-listen, we override the cardIds to prioritize cards the user has
 * marked "Review Again" — same number of breaks, but they target the cards
 * that actually need reinforcement. First-listen behavior unchanged.
 */
function chooseInterruptionPoints(
  generated: AudioInterruptionPoint[],
  cards: Flashcard[],
  briefingId: string,
): AudioInterruptionPoint[] {
  if (generated.length === 0 || cards.length === 0) return generated;
  const history = briefingLibrary.getReviewHistory(briefingId);
  if (Object.keys(history).length === 0) return generated;

  const ranked = cards
    .map(card => {
      const h = history[card.id];
      const struggle = h ? h.reviewAgain - h.gotIt : 0;
      const novelty = h ? 0 : 0.5;
      const recency = h?.lastReviewedAt ?? '';
      return { card, score: struggle + novelty, recency };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.recency.localeCompare(b.recency);
    });

  return generated.map((point, idx) => ({
    afterSectionIndex: point.afterSectionIndex,
    cardId: ranked[idx % ranked.length].card.id,
  }));
}

/**
 * Translate a TTS proxy failure into a single-sentence user-visible
 * message. There is NO browser-voice fallback anymore — if nova
 * (`/api/proxy/tts`) can't deliver, we surface the error and the user
 * has to retry. Robotic browser voice is never substituted.
 */
function classifyAudioError(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return 'Out of credits. Add a payment method to continue listening.';
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('401') || m.includes('unauthor') || m.includes('sign in')) {
      return 'Sign in to play this audio.';
    }
    if (m.includes('429') || m.includes('rate')) {
      return 'Rate limited. Try again in a moment.';
    }
    if (m.includes('timeout') || m.includes('aborted')) {
      return 'Voice service timed out. Tap play to retry.';
    }
    if (m.includes('payment') || m.includes('402')) {
      return 'Add a payment method to continue.';
    }
  }
  return 'Voice service unavailable. Tap play to retry.';
}

interface UseAudioPlaybackInput {
  /** When null, the hook returns idle/no-op values — used when the orb is
   *  rendered outside a content state (sign-in, library, topic input). */
  briefing: AudioBriefing | null;
  cards: Flashcard[];
  /** Identity of the underlying audio script. The briefing's `briefing_id`
   *  is keyed to flashcards.id (deck-level), but a reframe replaces the
   *  audioScript while keeping the same deck — so we need a separate
   *  identity to trigger the per-section blob cache reset. Pass
   *  `audioScript.id` from useContentGeneration. */
  audioScriptId?: string;
  /** Section index to start at on briefing-change (dive-exit resume). */
  initialSectionIndex?: number;
  /** Called once after the player has consumed `initialSectionIndex`. */
  onInitialSectionConsumed?: () => void;
  /** When true, the player is paused + frozen (sectionIndex preserved). */
  inactive?: boolean;
}

interface UseAudioPlaybackOutput {
  flareState: FlareState;
  ringProgress: number;
  statusLabel: string;
  sectionIndex: number;
  isSectionPlaying: boolean;
  isFetchingAudio: boolean;
  pendingCard: Flashcard | null;
  cardRevealed: boolean;
  setCardRevealed: (v: boolean) => void;
  showScript: boolean;
  setShowScript: (v: boolean) => void;
  voiceError: string | null;
  setVoiceError: (v: string | null) => void;
  hasSections: boolean;
  handlePlayPause: () => void;
  handleCardVerdict: (verdict: 'gotIt' | 'reviewAgain') => void;
  /** Section count, useful for sectionMarks on the orb's progress ring. */
  sectionCount: number;
}

/**
 * Imperative audio playback state — extracted from the old AudioPlayer
 * component so the JARVIS orb (mounted at App level) and the section-text
 * band (mounted inside the ContextBand) can both consume the same state
 * without one being a child of the other.
 *
 * The hook owns:
 *   - section-by-section TTS playback (OpenAI nova preferred, browser
 *     speechSynthesis as fallback)
 *   - per-section blob URL caching + prefetch of the next section
 *   - mid-listen flashcard checkpoint (`pendingCard`) state machine
 *   - `flareState` + `ringProgress` derivation for the orb
 *
 * When `briefing` is null (the user is in a non-content state — sign-in,
 * library, etc.), the hook returns idle no-op values so the orb still
 * renders sensibly without audio context.
 */
export function useAudioPlayback({
  briefing,
  cards,
  audioScriptId,
  initialSectionIndex,
  onInitialSectionConsumed,
  inactive = false,
}: UseAudioPlaybackInput): UseAudioPlaybackOutput {
  const { playerState, loadBriefing } = useAudioPlayer();

  const [showScript, setShowScript] = useState(false);

  const sections = briefing?.sections;
  const interruptionPoints = useMemo(
    () => chooseInterruptionPoints(briefing?.interruptionPoints ?? [], cards, briefing?.briefing_id ?? ''),
    [briefing?.interruptionPoints, cards, briefing?.briefing_id],
  );
  const cardsById = useMemo(() => {
    const m = new Map<string, Flashcard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);
  const hasSections = !!(sections && sections.length > 0);
  const sectionCount = sections?.length ?? 0;

  const [sectionIndex, setSectionIndex] = useState(0);
  const [isSectionPlaying, setIsSectionPlaying] = useState(false);
  const [pendingCard, setPendingCard] = useState<Flashcard | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Map<number, string>>(new Map());
  const inFlightRef = useRef<Map<number, Promise<string | null>>>(new Map());

  // Lazy-init the HTMLAudioElement once.
  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, []);

  // When inactive (parent stashed for a dive), pause playback.
  // sectionIndex is preserved so popping back resumes in place.
  useEffect(() => {
    if (!inactive) return;
    audioElRef.current?.pause();
    setIsSectionPlaying(false);
  }, [inactive]);

  // When the briefing changes, reset state + free cached blob URLs.
  // Honours `initialSectionIndex` so dive-exit lands at the saved section.
  // Also re-runs on audioScriptId change so a reframe (same deck, new
  // narration) drops stale per-section blob URLs.
  const briefingId = briefing?.briefing_id;
  useEffect(() => {
    if (!briefing) return;
    loadBriefing(briefing);
    const startAt =
      typeof initialSectionIndex === 'number' &&
      initialSectionIndex >= 0 &&
      sections &&
      initialSectionIndex < sections.length
        ? initialSectionIndex
        : 0;
    setSectionIndex(startAt);
    if (typeof initialSectionIndex === 'number') {
      onInitialSectionConsumed?.();
    }
    setIsSectionPlaying(false);
    setPendingCard(null);
    setCardRevealed(false);
    setVoiceError(null);
    inFlightRef.current.clear();
    return () => {
      audioElRef.current?.pause();
      for (const url of audioUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioUrlsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId, audioScriptId]);

  const fetchSectionAudio = useCallback(async (i: number): Promise<string | null> => {
    if (!sections) return null;
    const cached = audioUrlsRef.current.get(i);
    if (cached) return cached;
    const inFlight = inFlightRef.current.get(i);
    if (inFlight) return inFlight;

    const section = sections[i];
    if (!section) return null;
    const text = section.content.slice(0, 4096);

    const promise = (async () => {
      try {
        const audioBlob = await fetchVoiceAudio(text);
        const url = URL.createObjectURL(audioBlob);
        audioUrlsRef.current.set(i, url);
        return url;
      } catch (err) {
        // Surface the failure in the banner — no silent browser-voice
        // fallback. The user sees what went wrong and can retry.
        setVoiceError(classifyAudioError(err));
        console.warn('OpenAI TTS unavailable', err);
        return null;
      } finally {
        inFlightRef.current.delete(i);
      }
    })();
    inFlightRef.current.set(i, promise);
    return promise;
  }, [sections]);

  const playSection = useCallback(async (i: number) => {
    if (!sections || i >= sections.length) {
      setIsSectionPlaying(false);
      return;
    }

    setSectionIndex(i);
    setIsFetchingAudio(true);
    const url = await fetchSectionAudio(i);
    setIsFetchingAudio(false);

    if (!url) {
      // Proxy failure already surfaced via voiceError banner. Stay
      // paused — never fall back to robotic browser TTS.
      setIsSectionPlaying(false);
      return;
    }

    const el = audioElRef.current;
    if (!el) {
      setIsSectionPlaying(false);
      return;
    }

    el.src = url;
    el.onplay = () => setIsSectionPlaying(true);
    el.onpause = () => setIsSectionPlaying(false);
    el.onended = () => {
      setIsSectionPlaying(false);
      const point = interruptionPoints.find(p => p.afterSectionIndex === i);
      const card = point ? cardsById.get(point.cardId) : undefined;
      if (card) {
        setPendingCard(card);
        setCardRevealed(false);
        return;
      }
      const next = i + 1;
      if (sections && next < sections.length) {
        playSection(next);
      }
    };
    el.onerror = () => {
      // Decoding failed on the cached blob — surface and let user retry.
      setIsSectionPlaying(false);
      setVoiceError('Audio playback failed. Tap play to retry.');
    };

    try {
      await el.play();
    } catch (err) {
      // play() rejection — typically autoplay policy or other browser
      // restriction. Stay paused; user can retry via the orb.
      setIsSectionPlaying(false);
      setVoiceError(classifyAudioError(err));
      return;
    }

    if (sections && i + 1 < sections.length) {
      void fetchSectionAudio(i + 1);
    }
  }, [sections, interruptionPoints, cardsById, fetchSectionAudio]);

  const handlePlayPause = useCallback(() => {
    if (!hasSections || !briefing) return;
    if (pendingCard) return;

    if (isSectionPlaying) {
      audioElRef.current?.pause();
      setIsSectionPlaying(false);
      return;
    }

    // Resume mid-section if the audio element has a source loaded.
    if (audioElRef.current?.paused && audioElRef.current.src) {
      void audioElRef.current.play().catch(err => {
        setVoiceError(classifyAudioError(err));
      });
      return;
    }

    void playSection(sectionIndex);
  }, [hasSections, briefing, pendingCard, isSectionPlaying, playSection, sectionIndex]);

  const handleCardVerdict = useCallback((verdict: 'gotIt' | 'reviewAgain') => {
    if (!pendingCard || !briefing) return;
    briefingLibrary.recordCardReview(briefing.briefing_id, pendingCard.id, verdict);

    const matchedPoint = interruptionPoints.find(p => p.cardId === pendingCard.id);
    const fromIndex = matchedPoint?.afterSectionIndex ?? sectionIndex;
    const advanceMs = verdict === 'gotIt' ? 800 : 1400;

    window.setTimeout(() => {
      setPendingCard(null);
      setCardRevealed(false);
      const nextIdx = fromIndex + 1;
      setSectionIndex(nextIdx);
      if (sections && nextIdx < sections.length) {
        void playSection(nextIdx);
      }
    }, advanceMs);
  }, [pendingCard, briefing, interruptionPoints, sectionIndex, sections, playSection]);

  // ── Derived values for the orb ──────────────────────────────────────
  const flareState: FlareState = pendingCard
    ? 'Quiz'
    : isFetchingAudio
      ? 'Loading'
      : isSectionPlaying
        ? 'Listening'
        : 'Idle';

  const ringProgress = briefing?.audio_file && playerState.duration > 0
    ? playerState.currentTime / playerState.duration
    : hasSections && sections
      ? (sectionIndex + (isSectionPlaying ? 0.5 : 0)) / sections.length
      : 0;

  const statusLabel = pendingCard
    ? 'recall time'
    : isFetchingAudio
      ? 'loading voice…'
      : isSectionPlaying
        ? 'playing'
        : 'ready';

  return {
    flareState,
    ringProgress,
    statusLabel,
    sectionIndex,
    isSectionPlaying,
    isFetchingAudio,
    pendingCard,
    cardRevealed,
    setCardRevealed,
    showScript,
    setShowScript,
    voiceError,
    setVoiceError,
    hasSections,
    handlePlayPause,
    handleCardVerdict,
    sectionCount,
  };
}
