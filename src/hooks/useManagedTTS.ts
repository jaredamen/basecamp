import { useState, useCallback } from 'react';
import { proxyTTS, InsufficientCreditsError } from '../services/managedProxy';

export const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', description: 'Expressive and animated' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and bright' },
] as const;

export type OpenAIVoiceId = (typeof OPENAI_VOICES)[number]['id'];

interface ManagedTTSState {
  isGenerating: boolean;
  audioUrl: string | null;
  error: string | null;
  insufficientCredits: boolean;
}

export function useManagedTTS() {
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoiceId>('nova');
  const [speed, setSpeed] = useState(1.0);
  const [state, setState] = useState<ManagedTTSState>({
    isGenerating: false,
    audioUrl: null,
    error: null,
    insufficientCredits: false,
  });

  const generateAudio = useCallback(
    async (text: string): Promise<string | null> => {
      setState({
        isGenerating: true,
        audioUrl: null,
        error: null,
        insufficientCredits: false,
      });

      try {
        const { audioBlob } = await proxyTTS({
          text,
          voice: selectedVoice,
          speed,
        });

        const url = URL.createObjectURL(audioBlob);
        setState({
          isGenerating: false,
          audioUrl: url,
          error: null,
          insufficientCredits: false,
        });
        return url;
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          setState({
            isGenerating: false,
            audioUrl: null,
            error: 'Not enough credits for audio generation.',
            insufficientCredits: true,
          });
        } else {
          setState({
            isGenerating: false,
            audioUrl: null,
            error: err instanceof Error ? err.message : 'Audio generation failed',
            insufficientCredits: false,
          });
        }
        return null;
      }
    },
    [selectedVoice, speed]
  );

  const previewVoice = useCallback(
    async (voiceId: OpenAIVoiceId): Promise<string | null> => {
      try {
        const { audioBlob } = await proxyTTS({
          text: 'Welcome to Basecamp. Let me help you learn something new today.',
          voice: voiceId,
          speed,
        });
        return URL.createObjectURL(audioBlob);
      } catch {
        return null;
      }
    },
    [speed]
  );

  const reset = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isGenerating: false,
      audioUrl: null,
      error: null,
      insufficientCredits: false,
    });
  }, [state.audioUrl]);

  return {
    // State
    ...state,
    selectedVoice,
    speed,
    voices: OPENAI_VOICES,

    // Actions
    setSelectedVoice,
    setSpeed,
    generateAudio,
    previewVoice,
    reset,
  };
}
