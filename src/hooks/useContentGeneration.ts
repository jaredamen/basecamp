import { useState, useCallback } from 'react';
import { useBYOK } from './useBYOK';
import { AIPromptingService, type FlashcardSet, type AudioScript } from '../services/aiPrompting';
import { proxyChat, InsufficientCreditsError } from '../services/managedProxy';

interface GenerationState {
  isGenerating: boolean;
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'complete';
  progress: number;
  error?: string;
  insufficientCredits?: boolean;
  flashcards?: FlashcardSet;
  audioScript?: AudioScript;
  /** True when the current state was hydrated from the library rather than
   *  freshly generated. Lets App.tsx skip the auto-save side-effect for
   *  restored briefings (which would otherwise re-stamp `savedAt`). */
  wasLoadedFromLibrary?: boolean;
}

interface GenerationInput {
  url?: string;
  text?: string;
  type: 'url' | 'text';
}

// Helper: call AI through the managed proxy, matching the same prompt pattern as AIPromptingService
async function callManagedAI(prompt: string): Promise<string> {
  const { result } = await proxyChat({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
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
    // BYOK users need a configured AI provider
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
      // Step 1: Get content (either from URL or direct text)
      let content: string;
      if (input.type === 'url' && input.url) {
        setState(prev => ({ ...prev, stage: 'fetching', progress: 20 }));
        content = await aiService.fetchContentFromUrl(input.url);
      } else if (input.type === 'text' && input.text) {
        content = input.text;
      } else {
        throw new Error('Invalid input: missing URL or text');
      }

      // Step 2: Generate flashcards
      setState(prev => ({ ...prev, stage: 'flashcards', progress: 40 }));
      let flashcards: FlashcardSet;

      if (isManaged) {
        // Managed: use the proxy
        const flashcardPrompt = aiService.getFlashcardPrompt(content, input.type);
        const flashcardJson = await callManagedAI(flashcardPrompt);
        flashcards = aiService.parseFlashcardResponse(flashcardJson, content, input.type);
      } else {
        // BYOK: direct call
        flashcards = await aiService.generateFlashcards(
          content,
          input.type,
          config!.aiProvider!
        );
      }

      setState(prev => ({
        ...prev,
        flashcards,
        progress: 70
      }));

      // Step 3: Generate audio script
      setState(prev => ({ ...prev, stage: 'audio', progress: 85 }));
      let audioScript: AudioScript;

      if (isManaged) {
        const audioPrompt = aiService.getAudioScriptPrompt(content, flashcards.cards);
        const audioJson = await callManagedAI(audioPrompt);
        audioScript = aiService.parseAudioScriptResponse(audioJson, flashcards.cards);
      } else {
        audioScript = await aiService.generateAudioScript(
          content,
          flashcards.cards,
          config!.aiProvider!
        );
      }

      // Complete
      setState({
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        flashcards,
        audioScript
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
  }, [config?.aiProvider, isManaged]);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      stage: 'idle',
      progress: 0
    });
  }, []);

  /** Hydrate state from a saved library briefing — skips generation, lands
   *  the user directly in the 'content' view. */
  const loadFromLibrary = useCallback((flashcards: FlashcardSet, audioScript: AudioScript) => {
    setState({
      isGenerating: false,
      stage: 'complete',
      progress: 100,
      flashcards,
      audioScript,
      wasLoadedFromLibrary: true,
    });
  }, []);

  return {
    ...state,
    generateContent,
    reset,
    loadFromLibrary,
    isConfigured: isManaged || !!(config?.aiProvider && config?.voiceProvider)
  };
}
