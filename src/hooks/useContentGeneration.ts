import { useState, useCallback } from 'react';
import { useBYOK } from './useBYOK';
import { AIPromptingService, type FlashcardSet, type AudioScript, type Flashcard } from '../services/aiPrompting';
import { proxyChat, InsufficientCreditsError } from '../services/managedProxy';

interface GenerationState {
  isGenerating: boolean;
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'diving' | 'complete';
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
  };
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
  const { config, isManaged } = useBYOK();
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    stage: 'idle',
    progress: 0
  });

  const aiService = AIPromptingService.getInstance();

  const generateContent = useCallback(async (input: GenerationInput) => {
    if (!isManaged && !config?.aiProvider) {
      setState(prev => ({ ...prev, error: 'AI provider not configured' }));
      return;
    }

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

      setState(prev => ({ ...prev, stage: 'flashcards', progress: 40 }));
      let flashcards: FlashcardSet;

      if (isManaged) {
        const flashcardPrompt = aiService.getFlashcardPrompt(content, input.type);
        // Higher temperature for analogy creativity; matches the BYOK path
        // which already overrides to 0.85 inside aiService.generateFlashcards.
        const flashcardJson = await callManagedAI(flashcardPrompt, { temperature: 0.85 });
        flashcards = aiService.parseFlashcardResponse(flashcardJson, content, input.type);
      } else {
        flashcards = await aiService.generateFlashcards(content, input.type, config!.aiProvider!);
      }

      setState(prev => ({ ...prev, flashcards, progress: 70 }));

      setState(prev => ({ ...prev, stage: 'audio', progress: 85 }));
      let audioScript: AudioScript;

      if (isManaged) {
        const audioPrompt = aiService.getAudioScriptPrompt(content, flashcards.cards);
        const audioJson = await callManagedAI(audioPrompt);
        audioScript = aiService.parseAudioScriptResponse(audioJson, flashcards.cards);
      } else {
        audioScript = await aiService.generateAudioScript(content, flashcards.cards, config!.aiProvider!);
      }

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
        setState({
          isGenerating: false,
          stage: 'idle',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        });
      }
    }
  }, [config, isManaged, aiService]);

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
  const deepDive = useCallback(async (selection: string) => {
    if (!isManaged && !config?.aiProvider) {
      setState(prev => ({ ...prev, error: 'AI provider not configured' }));
      return;
    }
    const trimmed = selection.trim();
    if (trimmed.length < 2) return;

    // Snapshot the current briefing so we can restore it on back.
    setState(prev => {
      if (!prev.flashcards || !prev.audioScript) return prev;
      // Don't bury an existing parent — keep the original parent so the
      // back action always returns to the user's top-level briefing.
      const parentSnapshot = prev.parentSnapshot ?? {
        flashcards: prev.flashcards,
        audioScript: prev.audioScript,
        originalContent: prev.originalContent,
      };
      return {
        ...prev,
        isGenerating: true,
        stage: 'diving',
        progress: 30,
        parentSnapshot,
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

      // Step 1: dive flashcards
      let diveCards: FlashcardSet;
      if (isManaged) {
        const prompt = aiService.getDeepDiveFlashcardPrompt(trimmed, parentContext, parentCards);
        const json = await callManagedAI(prompt, { maxTokens: 2000, temperature: 0.85 });
        diveCards = aiService.parseFlashcardResponse(json, parentContext, 'text');
      } else {
        // BYOK: reuse the same direct-call path generateFlashcards uses, but
        // with the dive prompt. Easiest is to inline the call rather than
        // refactor the BYOK path.
        const prompt = aiService.getDeepDiveFlashcardPrompt(trimmed, parentContext, parentCards);
        const provider = config!.aiProvider!;
        const baseURL = provider.baseURL || 'https://api.openai.com/v1';
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });
        if (!response.ok) throw new Error(`Dive flashcards failed (${response.status})`);
        const data = await response.json();
        diveCards = aiService.parseFlashcardResponse(data.choices[0].message.content, parentContext, 'text');
      }

      setState(prev => ({ ...prev, flashcards: diveCards, progress: 70 }));

      // Step 2: dive audio
      let diveAudio: AudioScript;
      if (isManaged) {
        const prompt = aiService.getDeepDiveAudioPrompt(trimmed, parentContext, diveCards.cards);
        const json = await callManagedAI(prompt, { maxTokens: 2000, temperature: 0.8 });
        diveAudio = aiService.parseAudioScriptResponse(json, diveCards.cards);
      } else {
        const prompt = aiService.getDeepDiveAudioPrompt(trimmed, parentContext, diveCards.cards);
        const provider = config!.aiProvider!;
        const baseURL = provider.baseURL || 'https://api.openai.com/v1';
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });
        if (!response.ok) throw new Error(`Dive audio failed (${response.status})`);
        const data = await response.json();
        diveAudio = aiService.parseAudioScriptResponse(data.choices[0].message.content, diveCards.cards);
      }

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
        error:
          error instanceof InsufficientCreditsError
            ? 'Not enough credits for the deep dive.'
            : error instanceof Error
              ? error.message
              : 'Deep dive failed',
        insufficientCredits: error instanceof InsufficientCreditsError,
      }));
    }
  }, [config, isManaged, aiService]);

  /** Pop the dive — restore the parent briefing. No-op if no dive active. */
  const exitDive = useCallback(() => {
    setState(prev => {
      if (!prev.parentSnapshot) return prev;
      return {
        ...prev,
        flashcards: prev.parentSnapshot.flashcards,
        audioScript: prev.parentSnapshot.audioScript,
        originalContent: prev.parentSnapshot.originalContent,
        parentSnapshot: undefined,
      };
    });
  }, []);

  return {
    ...state,
    generateContent,
    reset,
    loadFromLibrary,
    updateCardAnalogy,
    deepDive,
    exitDive,
    /** True when we're inside a dive — UI can show a "Back to parent briefing" affordance. */
    isInDive: !!state.parentSnapshot,
    isConfigured: isManaged || !!(config?.aiProvider && config?.voiceProvider)
  };
}

// Re-export Flashcard for convenience to consumers that need the type
export type { Flashcard };
