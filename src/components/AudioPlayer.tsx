import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, Loader2 } from 'lucide-react';
import type { AudioBriefing, AudioInterruptionPoint } from '../types';
import type { Flashcard } from '../services/aiPrompting';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTTS } from '../hooks/useTTS';
import { useBYOK } from '../hooks/useBYOK';
import { useFlashcardAI } from '../hooks/useFlashcardAI';
import { fetchVoiceAudio, InsufficientCreditsError } from '../services/voiceTTS';
import { briefingLibrary } from '../services/briefingLibrary';

interface AudioPlayerProps {
  briefing: AudioBriefing;
  /** The deck of flashcards backing this briefing. The audio's interruption
   *  points reference cards from here by id; the player surfaces them as
   *  flashcard-flip overlays mid-listen. Pass an empty array if no deck
   *  (legacy briefings) — the audio plays without interruptions. */
  cards: Flashcard[];
  /** Source text the briefing was built from. Used by the FlashcardOverlay
   *  for analogy refresh + dive triggering. Empty string is fine. */
  parentContent?: string;
  /** Section index to start at on briefing-change. Used by the dive-exit
   *  flow to bounce the listener back to where they were when they dove.
   *  Undefined / 0 = start at the beginning. */
  initialSectionIndex?: number;
  /** Called once after the player has consumed `initialSectionIndex`, so
   *  the caller can clear it. Without this clearance, subsequent re-renders
   *  would keep snapping playback back to the saved index. */
  onInitialSectionConsumed?: () => void;
  /** When true, the player is rendered as a frozen background layer behind
   *  a dive sheet: pauses any active audio, hides the FlashcardOverlay, and
   *  becomes non-interactive. SectionIndex state is preserved across the
   *  transition so the player resumes in place when the sheet pops. */
  inactive?: boolean;
  /** Surfaces a small "🎵 Re-framing audio…" banner inline so the user
   *  knows the briefing is being regenerated without a full-screen
   *  takeover. Used by the parent's "Different analogy" trigger. */
  isReframing?: boolean;
  /** Trigger a recursive dive. AudioPlayer passes the section the user was
   *  on, so the parent can store it for resume on exit. */
  onDeepDive?: (selection: string, currentSectionIndex?: number) => void;
  /** Replace one card's analogy with new text (called after a successful
   *  regeneration via useFlashcardAI). */
  onAnalogyUpdated?: (cardId: string, newExplanation: string) => void;
  /** Re-roll the entire audio script with a fresh analogy palette. Deck
   *  stays the same; only the narration's framing is regenerated. */
  onReframeAudio?: () => void;
  onBack: () => void;
}

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

  // Score each card: higher = more in need of review. Cards never reviewed
  // get a small boost so the user sees variety on a re-listen.
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
      // Tie: least-recently-seen wins (older `recency` string sorts first).
      return a.recency.localeCompare(b.recency);
    });

  return generated.map((point, idx) => ({
    afterSectionIndex: point.afterSectionIndex,
    cardId: ranked[idx % ranked.length].card.id,
  }));
}

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

type Backend = 'openai' | 'browser';

/**
 * Convert any error from /api/proxy/tts into a single-sentence user-visible
 * message that explains why the high-quality voice isn't playing. We always
 * fall back to the browser robot voice, but the user must know *why* — silent
 * degradation is the worst possible UX.
 */
function classifyAudioError(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return 'Out of credits. Add a payment method to keep listening with the high-quality voice.';
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('401') || m.includes('unauthor') || m.includes('sign in')) {
      return 'Sign in to use the high-quality voice. Using browser voice for now.';
    }
    if (m.includes('429') || m.includes('rate')) {
      return 'Rate limited. Using browser voice for now — try again in a moment.';
    }
    if (m.includes('timeout') || m.includes('aborted')) {
      return 'Voice service timed out. Using browser voice.';
    }
    if (m.includes('payment') || m.includes('402')) {
      return 'Add a payment method to use the high-quality voice. Using browser voice for now.';
    }
  }
  return 'Voice service unavailable. Using browser voice.';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  briefing,
  cards,
  parentContent = '',
  initialSectionIndex,
  onInitialSectionConsumed,
  inactive = false,
  isReframing = false,
  onDeepDive,
  onAnalogyUpdated,
  onReframeAudio,
  onBack,
}) => {
  const { playerState, loadBriefing, play, pause } = useAudioPlayer();
  const { ttsState, speak, stop: stopTTS } = useTTS();
  const { config, isManaged } = useBYOK();
  // BYOK with an OpenAI key → call OpenAI directly. Managed → /api/proxy/tts.
  const byokOpenAIKey =
    !isManaged && config?.aiProvider?.id === 'openai'
      ? config.aiProvider.apiKey
      : undefined;
  const [showScript, setShowScript] = useState(false);

  const sections = briefing.sections;
  // Re-listen smart selection: if the user has Got It / Review Again history
  // on this briefing, override which cards interrupt where.
  const interruptionPoints = useMemo(
    () => chooseInterruptionPoints(briefing.interruptionPoints ?? [], cards, briefing.briefing_id),
    [briefing.interruptionPoints, cards, briefing.briefing_id],
  );
  const cardsById = useMemo(() => {
    const m = new Map<string, Flashcard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);
  // Section-by-section nova playback works regardless of whether the LLM
  // returned valid interruption points. Don't gate the good voice on that —
  // if the model hallucinated card IDs and the parser dropped them all, we
  // still want nova playing the sections, just without flashcard interrupts.
  // (The onend handlers already no-op gracefully when no card is matched.)
  const hasSections = !!(sections && sections.length > 0);

  const [sectionIndex, setSectionIndex] = useState(0);
  const [isSectionPlaying, setIsSectionPlaying] = useState(false);
  const [pendingCard, setPendingCard] = useState<Flashcard | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [backend, setBackend] = useState<Backend>('openai');
  /** Single voice-error banner. Set whenever we fall back from OpenAI nova
   *  to the browser robot voice, so the user always knows *why*. */
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // OpenAI audio playback. Cache one blob URL per section so re-listening
  // doesn't re-bill, and prefetch the next section while the current one plays.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Map<number, string>>(new Map());
  const inFlightRef = useRef<Map<number, Promise<string | null>>>(new Map());

  // Browser-speech fallback path
  const sectionUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceSettingsRef = useRef(ttsState.voiceSettings);
  useEffect(() => {
    voiceSettingsRef.current = ttsState.voiceSettings;
  }, [ttsState.voiceSettings]);

  // Lazy-init the HTMLAudioElement once
  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, []);

  // Pause everything the moment the player goes inactive (e.g. a dive sheet
  // just opened on top of us). We deliberately don't reset sectionIndex or
  // any other state — popping the sheet should reveal the player exactly
  // as the user left it, so they can resume mid-section without a tap.
  useEffect(() => {
    if (!inactive) return;
    audioElRef.current?.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSectionPlaying(false);
  }, [inactive]);

  // When the briefing changes, reset state and free any cached blob URLs.
  // Depends only on briefingId — useAudioPlayer.loadBriefing isn't memoized,
  // so depending on it here would re-run every render and the cleanup would
  // cancel speech mid-playback.
  //
  // initialSectionIndex (when provided) lands the player at a specific
  // section instead of 0 — used by the dive-exit flow so the parent's
  // audio resumes where the user left off. We consume it once on mount
  // and tell the parent to clear it.
  const briefingId = briefing.briefing_id;
  useEffect(() => {
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
    setBackend('openai');
    setVoiceError(null);
    inFlightRef.current.clear();
    return () => {
      window.speechSynthesis.cancel();
      audioElRef.current?.pause();
      for (const url of audioUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioUrlsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId]);

  /** Fetch and cache the OpenAI MP3 for a single section. Returns a blob URL,
   *  or null if the call failed (network, 401 demo path, etc.) so the caller
   *  can fall back to browser speech. */
  const fetchSectionAudio = useCallback(async (i: number): Promise<string | null> => {
    if (!sections) return null;
    const cached = audioUrlsRef.current.get(i);
    if (cached) return cached;
    const inFlight = inFlightRef.current.get(i);
    if (inFlight) return inFlight;

    const section = sections[i];
    if (!section) return null;
    // The TTS endpoint caps at 4096 chars. Sections should fit comfortably,
    // but slice defensively rather than 400 the whole call.
    const text = section.content.slice(0, 4096);

    const promise = (async () => {
      try {
        const audioBlob = await fetchVoiceAudio(text, byokOpenAIKey);
        const url = URL.createObjectURL(audioBlob);
        audioUrlsRef.current.set(i, url);
        return url;
      } catch (err) {
        // Always tell the user *why* we're falling back. Silent degradation
        // to the browser robot voice is the worst possible UX.
        setVoiceError(classifyAudioError(err));
        console.warn('OpenAI TTS unavailable, falling back to browser voice', err);
        return null;
      } finally {
        inFlightRef.current.delete(i);
      }
    })();
    inFlightRef.current.set(i, promise);
    return promise;
  }, [sections, byokOpenAIKey]);

  /** Browser-speech fallback. Used when OpenAI TTS isn't available
   *  (demo path, no auth, no credits, network failure). */
  const speakViaBrowser = useCallback((i: number) => {
    if (!sections || i >= sections.length) {
      setIsSectionPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const section = sections[i];
    const utterance = new SpeechSynthesisUtterance(section.content);
    const settings = voiceSettingsRef.current;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => setIsSectionPlaying(true);
    utterance.onend = () => {
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
        setSectionIndex(next);
        speakViaBrowser(next);
      }
    };
    utterance.onerror = () => setIsSectionPlaying(false);

    sectionUtteranceRef.current = utterance;
    setSectionIndex(i);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, [sections, interruptionPoints, cardsById]);

  /** Play section i: prefer OpenAI audio, fall back to browser speech. */
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
      setBackend('browser');
      speakViaBrowser(i);
      return;
    }
    setBackend('openai');

    const el = audioElRef.current;
    if (!el) {
      speakViaBrowser(i);
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
      setIsSectionPlaying(false);
      // Audio element failed to play this blob — fall back to browser speech.
      setBackend('browser');
      speakViaBrowser(i);
    };

    try {
      await el.play();
    } catch {
      setBackend('browser');
      speakViaBrowser(i);
      return;
    }

    // Prefetch the next section while the current one plays so the handoff
    // is seamless (no audible gap waiting on the network).
    if (sections && i + 1 < sections.length) {
      void fetchSectionAudio(i + 1);
    }
  }, [sections, interruptionPoints, cardsById, fetchSectionAudio, speakViaBrowser]);

  const handlePlayPause = () => {
    if (hasSections) {
      if (pendingCard) return;

      if (isSectionPlaying) {
        if (backend === 'openai') {
          audioElRef.current?.pause();
        } else {
          window.speechSynthesis.pause();
        }
        setIsSectionPlaying(false);
        return;
      }

      // Resume mid-section
      if (backend === 'openai' && audioElRef.current?.paused && audioElRef.current.src) {
        void audioElRef.current.play();
        return;
      }
      if (backend === 'browser' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsSectionPlaying(true);
        return;
      }

      // Fresh start (or after an answered quiz)
      void playSection(sectionIndex);
      return;
    }

    // Legacy / non-interactive briefings: original behaviour
    if (playerState.isPlaying || ttsState.isReading) {
      pause();
      stopTTS();
    } else {
      if (briefing.audio_file) {
        play();
      } else {
        speak(briefing.script);
      }
    }
  };

  const handleCardVerdict = (verdict: 'gotIt' | 'reviewAgain') => {
    if (!pendingCard) return;
    // Persist to the library so re-listens can prioritize struggle cards.
    // No-op if the briefing isn't saved yet (first listen before auto-save).
    briefingLibrary.recordCardReview(briefing.briefing_id, pendingCard.id, verdict);

    // Find which interruption point this card resolved so we know which
    // section to advance past.
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
  };

  const isCurrentlyPlaying = hasSections
    ? isSectionPlaying
    : (playerState.isPlaying || ttsState.isReading);

  const statusLabel = pendingCard
    ? 'Recall time'
    : isFetchingAudio
      ? 'Loading voice…'
      : isSectionPlaying
        ? backend === 'browser' ? 'Playing (browser voice)' : 'Playing'
        : 'Ready';

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="glass px-4 py-3 border-b border-solar-gold/15">
        <div className="flex items-center justify-between mb-3 gap-2">
          <button
            onClick={onBack}
            className="flex items-center text-solar-gold hover:text-solar-amber transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            {onReframeAudio && (
              <button
                onClick={onReframeAudio}
                disabled={isReframing}
                title="Re-frame this lesson with a different analogy"
                className="text-xs text-solar-gold hover:text-solar-amber disabled:text-solar-500 disabled:cursor-not-allowed px-2.5 py-1 rounded border border-solar-gold/40 hover:border-solar-gold/60 disabled:border-solar-700 hover:bg-solar-gold/10 disabled:hover:bg-transparent transition-colors flex items-center gap-1"
              >
                <span>💡</span>
                <span>{isReframing ? 'Re-framing…' : 'Different analogy'}</span>
              </button>
            )}
            <button
              onClick={() => setShowScript(!showScript)}
              className="text-xs text-solar-500 hover:text-solar-100 px-2 py-1 rounded border border-solar-gold/15 hover:border-solar-gold/30"
            >
              {showScript ? 'Hide Script' : 'Show Script'}
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-solar-100 mb-1">
          {briefing.title}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-solar-500 font-mono">
          <span>{formatDate(briefing.created_at)}</span>
          {briefing.source && (() => {
            try {
              const hostname = new URL(briefing.source).hostname;
              return (
                <>
                  <span>&bull;</span>
                  <span>{hostname}</span>
                </>
              );
            } catch {
              return null;
            }
          })()}
          {hasSections && sections && (
            <>
              <span>&bull;</span>
              <span>Section {Math.min(sectionIndex + 1, sections.length)} of {sections.length}</span>
            </>
          )}
        </div>
      </div>

      {voiceError && (
        <div className="bg-solar-ember/15 border-b border-solar-ember/30 text-solar-ember text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span className="flex-1">{voiceError}</span>
          <button
            onClick={() => setVoiceError(null)}
            className="text-solar-ember hover:text-solar-100 text-xs underline-offset-2 hover:underline"
            aria-label="Dismiss voice notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* In-place reframe banner. Replaces the old full-screen LoadingIndicator
          for the audio re-frame flow — the deck stays the same, only the
          narration is being regenerated, so a banner is enough context. */}
      {isReframing && (
        <div className="bg-solar-gold/10 border-b border-solar-gold/30 text-solar-gold text-sm px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span className="flex-1">🎵 Re-framing this lesson with a fresh analogy…</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {showScript ? (
          <div className="p-4 pb-32">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-solar-100/85 leading-relaxed">
                {briefing.script}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            {briefing.audio_file && playerState.duration > 0 && (
              <div className="w-full max-w-sm mb-6">
                <div className="bg-solar-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-solar-gold to-solar-amber h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(playerState.currentTime / playerState.duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-solar-500 font-mono">
                  <span>{formatTime(playerState.currentTime)}</span>
                  <span>{formatTime(playerState.duration)}</span>
                </div>
              </div>
            )}
            {hasSections && sections && !briefing.audio_file && (
              <div className="w-full max-w-md mb-6">
                <div className="bg-solar-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-solar-gold to-solar-amber h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((sectionIndex + (isSectionPlaying ? 0.5 : 0)) / sections.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-solar-500 font-mono mt-2">
                  <span>{statusLabel}</span>
                  <span>{interruptionPoints.length} checkpoint{interruptionPoints.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Play/Pause Button */}
      <div className="glass border-t border-solar-gold/15 p-4 pb-20">
        <div className="audio-player-controls">
          <button
            onClick={handlePlayPause}
            disabled={!!pendingCard || isFetchingAudio}
            className="p-4 bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed rounded-full text-solar-900 shadow-lg shadow-solar-gold/30 transition-colors"
            aria-label={isCurrentlyPlaying ? 'Pause' : isFetchingAudio ? 'Loading' : 'Play'}
          >
            {isFetchingAudio ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isCurrentlyPlaying ? (
              <Pause className="w-8 h-8" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8 ml-1" fill="currentColor" />
            )}
          </button>
        </div>
      </div>

      {/* Suppress the overlay while inactive so it doesn't peek through the
          dive sheet's backdrop. pendingCard state is preserved — when the
          sheet pops and inactive flips back to false, the overlay re-renders
          exactly where the user left it. */}
      {pendingCard && !inactive && (
        <FlashcardOverlay
          card={pendingCard}
          revealed={cardRevealed}
          parentContent={parentContent}
          onReveal={() => setCardRevealed(true)}
          onVerdict={handleCardVerdict}
          // Wrap onDeepDive so the overlay only needs to pass `selection`;
          // we attach the current sectionIndex here so the parent can save
          // it for resume-on-exit.
          onDeepDive={onDeepDive ? (sel: string) => onDeepDive(sel, sectionIndex) : undefined}
          onAnalogyUpdated={onAnalogyUpdated}
        />
      )}
    </div>
  );
};

interface FlashcardOverlayProps {
  card: Flashcard;
  revealed: boolean;
  parentContent: string;
  onReveal: () => void;
  onVerdict: (verdict: 'gotIt' | 'reviewAgain') => void;
  /** Triggered with the user-picked keyTerm. AudioPlayer attaches the
   *  current sectionIndex separately before forwarding upward. */
  onDeepDive?: (selection: string) => void;
  onAnalogyUpdated?: (cardId: string, newExplanation: string) => void;
}

/**
 * Mid-listen flashcard interrupt. Shows the question (front), accepts the
 * user's typed recall (optional), grades it via the LLM, then reveals the
 * canonical answer + analogy. Same mechanic as the standalone Study Cards
 * view — one concept, three surfaces (cards / audio interrupt / re-listen).
 *
 * On the back: "Try a different analogy" regenerates just `explanation`,
 * "Dive deeper" triggers a recursive sub-briefing.
 */
const FlashcardOverlay: React.FC<FlashcardOverlayProps> = ({
  card,
  revealed,
  parentContent,
  onReveal,
  onVerdict,
  onDeepDive,
  onAnalogyUpdated,
}) => {
  const { gradeAnswer, regenerateAnalogy } = useFlashcardAI();
  const hasMCQ = !!(card.choices && card.choices.length === 4 && typeof card.correctIndex === 'number');

  // Default to MCQ mode when the card has choices — tapping is faster than
  // typing while listening hands-free. User can switch to type if they
  // want fuller recall practice.
  const [mode, setMode] = useState<'mcq' | 'type'>(hasMCQ ? 'mcq' : 'type');
  const [mcqSelection, setMcqSelection] = useState<number | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [verdict, setVerdict] = useState<{ verdict: 'correct' | 'close' | 'wrong'; feedback: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [analogyError, setAnalogyError] = useState<string | null>(null);

  const handleMCQTap = (idx: number) => {
    if (mcqSelection !== null || !hasMCQ) return;
    setMcqSelection(idx);
    const isCorrect = idx === card.correctIndex;
    setVerdict({
      verdict: isCorrect ? 'correct' : 'wrong',
      feedback: isCorrect
        ? 'Right.'
        : `Not quite — the correct answer was ${String.fromCharCode(65 + (card.correctIndex ?? 0))}.`,
    });
    // Reveal the canonical answer + analogy after a brief beat so the
    // listener has time to register the verdict.
    window.setTimeout(onReveal, isCorrect ? 700 : 1500);
  };

  const handleCheck = async () => {
    if (!studentAnswer.trim() || grading) return;
    setGrading(true);
    try {
      const result = await gradeAnswer(card, studentAnswer);
      setVerdict(result);
      window.setTimeout(onReveal, 600);
    } catch (err) {
      setVerdict({
        verdict: 'close',
        feedback: err instanceof Error ? `Couldn't grade: ${err.message}` : 'Reveal to compare.',
      });
      onReveal();
    } finally {
      setGrading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || !onAnalogyUpdated) return;
    setRefreshing(true);
    setAnalogyError(null);
    try {
      const fresh = await regenerateAnalogy(card, parentContent);
      onAnalogyUpdated(card.id, fresh);
    } catch (err) {
      setAnalogyError(err instanceof Error ? err.message : 'Could not refresh analogy.');
    } finally {
      setRefreshing(false);
    }
  };

  const verdictBadge =
    verdict?.verdict === 'correct'
      ? { bg: 'bg-green-500/15 border-green-400/40', text: 'text-green-300', label: '✓ Correct' }
      : verdict?.verdict === 'close'
        ? { bg: 'bg-yellow-500/15 border-yellow-400/40', text: 'text-yellow-300', label: '~ Close' }
        : verdict?.verdict === 'wrong'
          ? { bg: 'bg-orange-500/15 border-orange-400/40', text: 'text-orange-300', label: '✗ Not quite' }
          : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-solar-900/85 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Active recall flashcard"
    >
      <div className="w-full max-w-lg glass-strong rounded-2xl p-6">
        <div className="flex items-center gap-2 text-solar-gold text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="inline-block w-2 h-2 rounded-full bg-solar-gold animate-pulse" />
          {revealed ? 'Answer' : 'Recall'}
        </div>

        <p className="text-lg font-semibold text-solar-100 leading-snug mb-5">{card.front}</p>

        {!revealed ? (
          mode === 'mcq' && hasMCQ && card.choices ? (
            // ── MCQ mode (audio-first interaction: tap a choice) ───────
            <div className="space-y-2">
              {card.choices.map((choice, idx) => {
                const isPicked = mcqSelection === idx;
                const isCorrectKey = idx === card.correctIndex;
                const answered = mcqSelection !== null;
                let cls = 'border-solar-gold/15 bg-solar-700 text-solar-100 hover:border-solar-gold/40 hover:bg-solar-gold/10';
                if (answered) {
                  if (isCorrectKey) cls = 'border-green-400/60 bg-green-500/15 text-solar-100';
                  else if (isPicked) cls = 'border-solar-ember/60 bg-solar-ember/15 text-solar-100';
                  else cls = 'border-solar-gold/10 bg-solar-700/50 text-solar-500 opacity-60';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleMCQTap(idx)}
                    disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm flex items-center gap-3 transition-all ${cls}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-solar-600 text-solar-100 font-bold font-mono text-xs flex items-center justify-center flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {answered && isCorrectKey && <span className="text-green-400 font-bold">✓</span>}
                    {answered && isPicked && !isCorrectKey && <span className="text-solar-ember font-bold">✗</span>}
                  </button>
                );
              })}
              {mcqSelection === null && (
                <button
                  onClick={() => setMode('type')}
                  className="w-full text-center text-xs text-solar-gold hover:text-solar-amber underline-offset-2 hover:underline pt-1"
                >
                  Or type your full answer
                </button>
              )}
            </div>
          ) : (
            // ── Type-the-answer mode ───────────────────────────────────
            <div className="space-y-3">
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Type what you think the answer is (optional)…"
                rows={2}
                className="w-full px-3 py-2 bg-solar-900/60 border border-solar-gold/20 rounded-lg text-solar-100 text-sm focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none resize-y"
                disabled={grading}
              />
              {verdictBadge && verdict && (
                <div className={`rounded-lg border px-3 py-2 ${verdictBadge.bg}`}>
                  <div className={`text-xs font-semibold ${verdictBadge.text}`}>{verdictBadge.label}</div>
                  <p className="text-xs text-solar-100/85 mt-0.5">{verdict.feedback}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCheck}
                  disabled={!studentAnswer.trim() || grading}
                  className="flex-1 py-2.5 rounded-xl bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed text-solar-900 font-semibold transition-colors"
                >
                  {grading ? 'Checking…' : 'Check my answer'}
                </button>
                <button
                  onClick={onReveal}
                  className="px-4 py-2.5 rounded-xl bg-solar-700 hover:bg-solar-600 text-solar-100 font-medium transition-colors"
                >
                  Show
                </button>
              </div>
              {hasMCQ && (
                <button
                  onClick={() => setMode('mcq')}
                  className="w-full text-center text-xs text-solar-gold hover:text-solar-amber underline-offset-2 hover:underline"
                >
                  Or pick from multiple choice
                </button>
              )}
            </div>
          )
        ) : (
          <>
            <div className="rounded-xl bg-solar-700/60 border border-solar-gold/15 p-4 space-y-3">
              <p className="text-base text-solar-100 leading-relaxed">{card.back}</p>
              {card.explanation && (
                <div className="pt-3 border-t border-solar-gold/15">
                  <p className="text-sm text-solar-400 italic leading-relaxed">{card.explanation}</p>
                  {analogyError && <p className="text-xs text-solar-ember mt-2">{analogyError}</p>}
                </div>
              )}
            </div>

            {/* Analogy refresh — only when the user didn't nail it. Hidden
                on verdict === 'correct'. Visible on wrong/close, OR when
                they skipped recall (verdict === null). */}
            {card.explanation && onAnalogyUpdated && verdict?.verdict !== 'correct' && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-solar-gold/15 border border-solar-gold/40 text-solar-gold hover:bg-solar-gold/25 disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="inline-block w-4 h-4 animate-spin" />
                    Generating a fresh parable…
                  </>
                ) : (
                  <>
                    <span>💡</span>
                    <span>This analogy didn't land — try a different one</span>
                  </>
                )}
              </button>
            )}

            {onDeepDive && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-solar-500">🤿 Dive deeper into:</div>
                <div className="flex flex-wrap gap-2">
                  {(card.keyTerms && card.keyTerms.length > 0
                    ? card.keyTerms
                    : [card.front]
                  ).map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => onDeepDive(term)}
                      className="text-xs px-3 py-1.5 rounded-full bg-solar-amber/15 border border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25 hover:border-solar-amber/60 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => onVerdict('reviewAgain')}
                className="flex-1 py-3 rounded-xl bg-solar-ember/20 border border-solar-ember/40 text-solar-ember hover:bg-solar-ember/30 font-semibold transition-colors"
              >
                👎 Review again
              </button>
              <button
                onClick={() => onVerdict('gotIt')}
                className="flex-1 py-3 rounded-xl bg-green-600/20 border border-green-600/40 text-green-300 hover:bg-green-600/30 font-semibold transition-colors"
              >
                👍 Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
