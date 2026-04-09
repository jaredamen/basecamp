import { useState, useCallback, useEffect } from 'react';
import { useBYOK } from './useBYOK';
import { 
  ElevenLabsTTSService, 
  type ElevenLabsVoice, 
  type VoiceCategory, 
  type AudioGeneration,
  type TTSGenerationOptions 
} from '../services/elevenLabsTTS';
import type { AudioScript } from '../services/aiPrompting';

interface ElevenLabsState {
  voices: ElevenLabsVoice[];
  categorizedVoices: VoiceCategory[];
  loading: boolean;
  error?: string;
  selectedVoice?: ElevenLabsVoice;
  previewAudio?: string;
  isGenerating: boolean;
  generatedAudio?: AudioGeneration[];
  currentlyPlaying?: string;
}

export function useElevenLabs() {
  const { config, updateVoiceProvider } = useBYOK();
  const [state, setState] = useState<ElevenLabsState>({
    voices: [],
    categorizedVoices: [],
    loading: false,
    isGenerating: false
  });

  const ttsService = ElevenLabsTTSService.getInstance();

  const loadVoices = useCallback(async () => {
    if (!config?.voiceProvider?.apiKey) {
      setState(prev => ({ ...prev, error: 'Voice provider not configured' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      const [voices, categorizedVoices] = await Promise.all([
        ttsService.getVoices(config.voiceProvider.apiKey),
        ttsService.getCategorizedVoices(config.voiceProvider.apiKey)
      ]);

      setState(prev => ({
        ...prev,
        voices,
        categorizedVoices,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load voices'
      }));
    }
  }, [config?.voiceProvider?.apiKey]);

  const selectVoice = useCallback((voice: ElevenLabsVoice) => {
    setState(prev => ({ ...prev, selectedVoice: voice }));
    
    // Update voice provider config
    if (config?.voiceProvider) {
      updateVoiceProvider({
        ...config.voiceProvider,
        selectedVoiceId: voice.voice_id,
        selectedVoiceName: voice.name
      });
    }
  }, [config?.voiceProvider, updateVoiceProvider]);

  const previewVoice = useCallback(async (voiceId: string) => {
    if (!config?.voiceProvider?.apiKey) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const previewUrl = await ttsService.previewVoice(voiceId, config.voiceProvider.apiKey);
      setState(prev => ({ 
        ...prev, 
        previewAudio: previewUrl, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Preview failed'
      }));
    }
  }, [config?.voiceProvider?.apiKey]);

  const generateAudio = useCallback(async (
    text: string, 
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration | null> => {
    if (!config?.voiceProvider) {
      setState(prev => ({ ...prev, error: 'Voice provider not configured' }));
      return null;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: undefined }));

    try {
      const generation = await ttsService.generateAudio(text, config.voiceProvider, options);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generatedAudio: [...(prev.generatedAudio || []), generation]
      }));
      return generation;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Audio generation failed'
      }));
      return null;
    }
  }, [config?.voiceProvider]);

  const generateFromScript = useCallback(async (
    script: AudioScript,
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration[]> => {
    if (!config?.voiceProvider) {
      setState(prev => ({ ...prev, error: 'Voice provider not configured' }));
      return [];
    }

    setState(prev => ({ ...prev, isGenerating: true, error: undefined }));

    try {
      const generations = await ttsService.generateFromScript(script, config.voiceProvider, options);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generatedAudio: [...(prev.generatedAudio || []), ...generations]
      }));
      return generations;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Script audio generation failed'
      }));
      return [];
    }
  }, [config?.voiceProvider]);

  const generateFullNarrative = useCallback(async (
    script: AudioScript,
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration | null> => {
    if (!config?.voiceProvider) {
      setState(prev => ({ ...prev, error: 'Voice provider not configured' }));
      return null;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: undefined }));

    try {
      const generation = await ttsService.generateFullNarrative(script, config.voiceProvider, options);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generatedAudio: [...(prev.generatedAudio || []), generation]
      }));
      return generation;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Narrative generation failed'
      }));
      return null;
    }
  }, [config?.voiceProvider]);

  const playAudio = useCallback((audioUrl: string) => {
    // Stop currently playing audio
    if (state.currentlyPlaying) {
      const currentAudio = document.querySelector('audio[src="' + state.currentlyPlaying + '"]') as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    setState(prev => ({ ...prev, currentlyPlaying: audioUrl }));

    // Play new audio
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      setState(prev => ({ ...prev, currentlyPlaying: undefined }));
    };
    audio.onerror = () => {
      setState(prev => ({ 
        ...prev, 
        currentlyPlaying: undefined,
        error: 'Failed to play audio'
      }));
    };
    audio.play().catch(error => {
      console.error('Audio play failed:', error);
      setState(prev => ({ 
        ...prev, 
        currentlyPlaying: undefined,
        error: 'Failed to play audio'
      }));
    });
  }, [state.currentlyPlaying]);

  const stopAudio = useCallback(() => {
    if (state.currentlyPlaying) {
      const currentAudio = document.querySelector('audio[src="' + state.currentlyPlaying + '"]') as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setState(prev => ({ ...prev, currentlyPlaying: undefined }));
    }
  }, [state.currentlyPlaying]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  const clearGeneratedAudio = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    state.generatedAudio?.forEach(audio => {
      URL.revokeObjectURL(audio.audioUrl);
    });
    setState(prev => ({ ...prev, generatedAudio: [] }));
  }, [state.generatedAudio]);

  // Auto-load voices when voice provider is configured
  useEffect(() => {
    if (config?.voiceProvider?.apiKey && state.voices.length === 0 && !state.loading) {
      loadVoices();
    }
  }, [config?.voiceProvider?.apiKey, state.voices.length, state.loading, loadVoices]);

  // Set selected voice from config
  useEffect(() => {
    if (config?.voiceProvider?.selectedVoiceId && state.voices.length > 0 && !state.selectedVoice) {
      const voice = state.voices.find(v => v.voice_id === config.voiceProvider!.selectedVoiceId);
      if (voice) {
        setState(prev => ({ ...prev, selectedVoice: voice }));
      }
    }
  }, [config?.voiceProvider?.selectedVoiceId, state.voices, state.selectedVoice]);

  return {
    ...state,
    loadVoices,
    selectVoice,
    previewVoice,
    generateAudio,
    generateFromScript,
    generateFullNarrative,
    playAudio,
    stopAudio,
    clearError,
    clearGeneratedAudio,
    isConfigured: !!(config?.voiceProvider?.apiKey)
  };
}