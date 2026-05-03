import { useState, useCallback } from 'react';
import { AIPromptingService, type FlashcardSet, type AudioScript, type Flashcard } from '../services/aiPrompting';
import { proxyChat, InsufficientCreditsError } from '../services/managedProxy';
import { loadProfile } from '../services/userProfile';

export type GenerationStage = 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'diving' | 'reframing' | 'complete';

interface GenerationState {
  isGenerating: boolean;
  stage: GenerationStage;
  progress: number;
  error?: string;
  insufficientCredits?: boolean;
  flashcards?: FlashcardSet;
  audioScript?: AudioScript;
  /** Original fetched/pasted source text. Preserved after generation completes
   *  so the recursive-dive flow has the parent context to focus from. */
  originalContent?: string;
  /** True when the current state was hydrated from the library rather than
   *  freshly generated. Lets App.tsx skip the auto-save side-effect for
   *  restored briefings (which would otherwise re-stamp `savedAt`). */
  wasLoadedFromLibrary?: boolean;
  /** When the user is inside a recursive dive, the parent briefing's
   *  flashcards + audio + originalContent are stashed here so the user can
   *  back out. v1 supports a single dive level; nested dives flatten. */
  parentSnapshot?: {
    flashcards: FlashcardSet;
    audioScript: AudioScript;
    originalContent?: string;
    /** Section the user was on when they triggered the dive. Restored on
     *  exit so the parent's audio resumes where they left off, not at the
     *  top. Optional — undefined when dive is triggered from Study Cards
     *  (no audio playing) or before any section change. */
    lastSectionIndex?: number;
  };
  /** Initial section index for the AudioPlayer to render at on the next
   *  briefing-change. Set during exitDive so the parent's audio resumes
   *  where the user left off. AudioPlayer reads it via the
   *  `initialSectionIndex` prop and clears it after consuming. */
  audioStartSectionIndex?: number;
  /** The term the user clicked to trigger the current dive. Surfaced to
   *  the dive-loading sheet so it can show "Diving into 'X'…" inline
   *  instead of a generic loading spinner. Cleared on dive completion
   *  (stage='complete') and on exitDive. */
  diveSelection?: string;
}

interface GenerationInput {
  url?: string;
  text?: string;
  type: 'url' | 'text';
}

async function callManagedAI(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.7 } = opts;
  const { result } = await proxyChat({
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });
  return result.choices[0].message.content;
}

export function useContentGeneration() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    stage: 'idle',
    progress: 0
  });

  const aiService = AIPromptingService.getInstance();

  const generateContent = useCallback(async (input: GenerationInput) => {
    setState({
      isGenerating: true,
      stage: 'fetching',
      progress: 10,
      error: undefined,
      insufficientCredits: false,
    });

    try {
      let content: string;
      if (input.type === 'url' && input.url) {
        setState(prev => ({ ...prev, stage: 'fetching', progress: 20 }));
        content = await aiService.fetchContentFromUrl(input.url);
      } else if (input.type === 'text' && input.text) {
        content = input.text;
      } else {
        throw new Error('Invalid input: missing URL or text');
      }

      // ── Audio-first pipeline ───────────────────────────────────────
      // 1) Generate the audio briefing FIRST. Audio is the driver: analogy
      //    leads, substance follows, the listener walks away knowing the
      //    actual content of the source.
      setState(prev => ({ ...prev, stage: 'audio', progress: 35 }));
      const userProfile = loadProfile();
      const audioPrompt = aiService.getAudioScriptPrompt(content, userProfile);
      const audioJson = await callManagedAI(audioPrompt, { temperature: 0.8, maxTokens: 3000 });
      const audioScriptBase: AudioScript = aiService.parseAudioScriptResponse(audioJson);

      setState(prev => ({ ...prev, audioScript: audioScriptBase, progress: 65 }));

      // 2) Generate flashcards DOWNSTREAM of the audio. The cards prompt
      //    sees the audio's sections and tests what the audio teaches —
      //    every named definition the audio covered should be a card.
      //    The cards-gen call also picks 2-4 interruption points (cardId +
      //    afterSectionIndex) since cards know which audio section they
      //    came from.
      setState(prev => ({ ...prev, stage: 'flashcards', progress: 80 }));
      const flashcardPrompt = aiService.getFlashcardPrompt(content, input.type, audioScriptBase, userProfile);
      const flashcardJson = await callManagedAI(flashcardPrompt, { temperature: 0.85 });
      const { flashcards, interruptionPoints } = aiService.parseFlashcardResponse(
        flashcardJson,
        content,
        input.type,
        audioScriptBase.sections.length,
      );

      // 3) Merge the LLM-picked interruption points back onto the audio
      //    script. The final AudioScript is the audio + the cards-derived
      //    checkpoint placements. Schema unchanged.
      const audioScript: AudioScript = { ...audioScriptBase, interruptionPoints };

      setState({
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        flashcards,
        audioScript,
        // Preserve the source so a later deepDive() has parent context to
        // focus from. Truncated to 20K chars (same as fetch-url's cap).
        originalContent: content.slice(0, 20_000),
      });
    } catch (error) {
      console.error('Content generation failed:', error);

      if (error instanceof InsufficientCreditsError) {
        setState({
          isGenerating: false,
          stage: 'idle',
          progress: 0,
          error: 'Not enough credits. Top up to continue learning!',
          insufficientCredits: true,
        });
      } else {
        // Friendlier copy when the failed input was a Wikipedia URL —
        // catches both the topic-mode auto-route failures (sparse
        // article / 404) and direct paste-a-Wikipedia-URL failures.
        const rawMessage = error instanceof Error ? error.message : 'Generation failed';
        const wikiUrl = input.url && input.url.includes('en.wikipedia.org/wiki/') ? input.url : null;
        const isFetchError = /fetch URL|too short|Unable to extract|404/i.test(rawMessage);
        let friendlyMessage = rawMessage;
        if (wikiUrl && isFetchError) {
          // Recover the topic name from the URL's last path segment
          // (decoded, underscores → spaces) for the nicer error.
          const segment = wikiUrl.split('/wiki/')[1] ?? '';
          const topic = decodeURIComponent(segment).replace(/_/g, ' ');
          friendlyMessage = topic
            ? `Couldn't learn from "${topic}" — that Wikipedia article was too short or doesn't exist. Try a different topic or paste your own text.`
            : 'Couldn\'t fetch that Wikipedia article. Try a different topic or paste your own text.';
        }

        setState({
          isGenerating: false,
          stage: 'idle',
          progress: 0,
          error: friendlyMessage,
        });
      }
    }
  }, [aiService]);

  const reset = useCallback(() => {
    setState({ isGenerating: false, stage: 'idle', progress: 0 });
  }, []);

  const loadFromLibrary = useCallback((
    flashcards: FlashcardSet,
    audioScript: AudioScript,
    originalContent?: string,
  ) => {
    setState({
      isGenerating: false,
      stage: 'complete',
      progress: 100,
      flashcards,
      audioScript,
      originalContent,
      wasLoadedFromLibrary: true,
    });
  }, []);

  /** Replace one card's analogy (explanation field) with new text in place.
   *  No regeneration here — caller fetches the new analogy via useFlashcardAI
   *  and hands us the result. Keeps state shape simple: same FlashcardSet,
   *  one card mutated. */
  const updateCardAnalogy = useCallback((cardId: string, newExplanation: string) => {
    setState(prev => {
      if (!prev.flashcards) return prev;
      const cards = prev.flashcards.cards.map(c =>
        c.id === cardId ? { ...c, explanation: newExplanation } : c
      );
      return {
        ...prev,
        flashcards: { ...prev.flashcards, cards },
      };
    });
  }, []);

  /**
   * Recursive dive: swap the current briefing for a focused sub-briefing on
   * the user's selection. The parent is stashed in `parentSnapshot` so the
   * back action can restore it.
   *
   * Generates BOTH flashcards and audio for the dive — same shape as a
   * top-level briefing, just smaller. The user can listen, study cards,
   * and even dive again from inside the dive (single-level for v1; a
   * second dive flattens into the same parent).
   */
  const deepDive = useCallback(async (
    selection: string,
    /** Section the user was on when they triggered the dive (from the
     *  AudioPlayer). Stashed in parentSnapshot so exitDive can resume the
     *  parent's audio where the user left off. */
    currentSectionIndex?: number,
  ) => {
    const trimmed = selection.trim();
    if (trimmed.length < 2) return;

    // Snapshot the current briefing so we can restore it on back.
    setState(prev => {
      if (!prev.flashcards || !prev.audioScript) return prev;
      // Don't bury an existing parent — keep the original parent so the
      // back action always returns to the user's top-level briefing. But
      // *do* update lastSectionIndex on each dive trigger so the most
      // recent playback position is the one we return to.
      const parentSnapshot = prev.parentSnapshot
        ? { ...prev.parentSnapshot, lastSectionIndex: currentSectionIndex ?? prev.parentSnapshot.lastSectionIndex }
        : {
            flashcards: prev.flashcards,
            audioScript: prev.audioScript,
            originalContent: prev.originalContent,
            lastSectionIndex: currentSectionIndex,
          };
      return {
        ...prev,
        isGenerating: true,
        stage: 'diving',
        progress: 30,
        parentSnapshot,
        // The dive itself starts at section 0 — it's a fresh briefing.
        audioStartSectionIndex: 0,
        // Surface the selection so the dive sheet can show
        // "Diving into 'X'…" inline while gen is in flight.
        diveSelection: trimmed,
        error: undefined,
      };
    });

    try {
      // Read the latest snapshot we just wrote.
      const snap = await new Promise<GenerationState['parentSnapshot']>(resolve => {
        setState(prev => {
          resolve(prev.parentSnapshot);
          return prev;
        });
      });
      if (!snap) throw new Error('No parent briefing to dive from');

      const parentCards = snap.flashcards.cards;
      const parentContext = snap.originalContent ?? '';

      // Audio-first dive: same order as the main path. Audio first, then
      // cards-from-audio (which also picks the dive's interruption points).

      const userProfile = loadProfile();

      // Step 1: dive AUDIO
      const audioPrompt = aiService.getDeepDiveAudioPrompt(trimmed, parentContext, userProfile);
      const audioJson = await callManagedAI(audioPrompt, { maxTokens: 2000, temperature: 0.8 });
      const diveAudioBase: AudioScript = aiService.parseAudioScriptResponse(audioJson);

      setState(prev => ({ ...prev, audioScript: diveAudioBase, progress: 60 }));

      // Step 2: dive CARDS (downstream of dive audio; also pick interruption
      // points referencing the dive's sections).
      const cardsPrompt = aiService.getDeepDiveFlashcardPrompt(trimmed, parentContext, parentCards, diveAudioBase, userProfile);
      const cardsJson = await callManagedAI(cardsPrompt, { maxTokens: 2000, temperature: 0.85 });
      const { flashcards: diveCards, interruptionPoints: diveInterruptionPoints } = aiService.parseFlashcardResponse(
        cardsJson,
        parentContext,
        'text',
        diveAudioBase.sections.length,
      );

      const diveAudio: AudioScript = { ...diveAudioBase, interruptionPoints: diveInterruptionPoints };

      setState(prev => ({
        ...prev,
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        flashcards: diveCards,
        audioScript: diveAudio,
        // The dive replaces originalContent with the focused selection so
        // a further dive uses the dive's framing as its own parent context.
        originalContent: `Focused dive on: ${trimmed}\n\nParent context (truncated): ${parentContext.slice(0, 4000)}`,
        // Generation done — clear the loading-state label.
        diveSelection: undefined,
      }));
    } catch (error) {
      console.error('Deep dive failed:', error);
      // Restore the parent on failure so the user isn't stranded.
      setState(prev => ({
        ...prev,
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        flashcards: prev.parentSnapshot?.flashcards ?? prev.flashcards,
        audioScript: prev.parentSnapshot?.audioScript ?? prev.audioScript,
        originalContent: prev.parentSnapshot?.originalContent ?? prev.originalContent,
        parentSnapshot: undefined,
        diveSelection: undefined,
        error:
          error instanceof InsufficientCreditsError
            ? 'Not enough credits for the deep dive.'
            : error instanceof Error
              ? error.message
              : 'Deep dive failed',
        insufficientCredits: error instanceof InsufficientCreditsError,
      }));
    }
  }, [aiService]);

  /** Pop the dive — restore the parent briefing AND the audio section the
   *  user was on when they triggered the dive, so playback bounces back
   *  to where they left off. */
  const exitDive = useCallback(() => {
    setState(prev => {
      if (!prev.parentSnapshot) return prev;
      return {
        ...prev,
        flashcards: prev.parentSnapshot.flashcards,
        audioScript: prev.parentSnapshot.audioScript,
        originalContent: prev.parentSnapshot.originalContent,
        parentSnapshot: undefined,
        diveSelection: undefined,
        // AudioPlayer reads this on its briefing-changed effect, restoring
        // the section the user was on. Cleared after consumption (see
        // clearAudioStartSection below).
        audioStartSectionIndex: prev.parentSnapshot.lastSectionIndex,
      };
    });
  }, []);

  /** Clear `audioStartSectionIndex` once the AudioPlayer has consumed it.
   *  Otherwise subsequent re-renders would keep snapping back to the saved
   *  index instead of letting the player progress naturally. */
  const clearAudioStartSection = useCallback(() => {
    setState(prev => (prev.audioStartSectionIndex === undefined
      ? prev
      : { ...prev, audioStartSectionIndex: undefined }));
  }, []);

  /**
   * Re-frame the audio briefing with a fresh analogy palette while keeping
   * the flashcard deck (and substantive content) the same. The "didn't
   * land — give me a different parable" button at the audio-script level.
   * Only the audioScript is replaced; the deck stays put so per-card review
   * history and library entry are unaffected.
   */
  const reframeAudio = useCallback(async () => {
    // Snapshot what we need before flipping into 'reframing'.
    const snapshot = await new Promise<{
      content: string;
      cards: Flashcard[];
      previousTitle: string;
    } | null>(resolve => {
      setState(prev => {
        if (!prev.flashcards || !prev.audioScript) {
          resolve(null);
          return prev;
        }
        resolve({
          content: prev.originalContent ?? '',
          cards: prev.flashcards.cards,
          previousTitle: prev.audioScript.title,
        });
        return {
          ...prev,
          isGenerating: true,
          stage: 'reframing',
          progress: 30,
          error: undefined,
        };
      });
    });
    if (!snapshot) return;

    try {
      const prompt = aiService.getAudioReframePrompt(
        snapshot.content,
        snapshot.cards,
        snapshot.previousTitle,
        loadProfile(),
      );

      const json = await callManagedAI(prompt, { maxTokens: 3000, temperature: 0.85 });
      const newAudioScript = aiService.parseAudioScriptResponse(json, snapshot.cards);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        audioScript: newAudioScript,
      }));
    } catch (error) {
      console.error('Audio re-frame failed:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        error:
          error instanceof InsufficientCreditsError
            ? 'Not enough credits to re-frame the lesson.'
            : error instanceof Error
              ? error.message
              : 'Audio re-frame failed',
        insufficientCredits: error instanceof InsufficientCreditsError,
      }));
    }
  }, [aiService]);

  return {
    ...state,
    generateContent,
    reset,
    loadFromLibrary,
    updateCardAnalogy,
    deepDive,
    exitDive,
    reframeAudio,
    clearAudioStartSection,
    /** True when we're inside a dive — UI can show a "Back to parent briefing" affordance. */
    isInDive: !!state.parentSnapshot,
    /** True when an audio re-frame is in flight — UI can disable the trigger. */
    isReframing: state.stage === 'reframing',
    isConfigured: true
  };
}

// Re-export Flashcard for convenience to consumers that need the type
export type { Flashcard };
