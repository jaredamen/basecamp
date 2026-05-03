import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVoiceAudio, InsufficientCreditsError } from '../services/voiceTTS';

/**
 * Convert a TTS proxy failure into a single-sentence user-visible
 * message. There is NO browser-voice fallback — when nova can't play,
 * we surface the error and stay silent. The robotic OS voice never
 * substitutes for the product voice.
 */
function classifyVoiceError(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return 'Out of credits. Add a payment method to continue.';
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
      return 'Voice service timed out.';
    }
    if (m.includes('payment') || m.includes('402')) {
      return 'Add a payment method to continue.';
    }
  }
  return 'Voice service unavailable.';
}

interface NovaTTSState {
  /** True from the moment .speak() is called until audio actually starts playing. */
  isFetching: boolean;
  /** True while the audio is sounding through the speakers. */
  isPlaying: boolean;
  /** Set when the proxy returns an error. Cleared on the next successful speak(). */
  errorMessage: string | null;
}

/**
 * Single-shot TTS hook for short reads (a flashcard, a hint, a button).
 * Calls /api/proxy/tts with voice='nova' and plays the returned MP3 via
 * an HTMLAudioElement. On failure, surfaces an error and stays silent —
 * NO fallback to robotic browser SpeechSynthesis.
 *
 * For long-form briefings with section gating + checkpoint prefetch,
 * AudioPlayer / useAudioPlayback manages its own playback path.
 */
export function useNovaTTS() {
  const [state, setState] = useState<NovaTTSState>({
    isFetching: false,
    isPlaying: false,
    errorMessage: null,
  });

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    audioElRef.current = new Audio();
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  const releaseCurrentBlob = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }
    releaseCurrentBlob();
    setState(prev => ({ ...prev, isPlaying: false, isFetching: false }));
  }, [releaseCurrentBlob]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stop();
    setState(prev => ({ ...prev, isFetching: true, errorMessage: null }));

    try {
      const audioBlob = await fetchVoiceAudio(text);
      const url = URL.createObjectURL(audioBlob);
      currentBlobUrlRef.current = url;

      const el = audioElRef.current;
      if (!el) {
        setState(prev => ({
          ...prev,
          isFetching: false,
          errorMessage: 'Audio playback unavailable.',
        }));
        return;
      }

      el.src = url;
      el.onplay = () => setState(prev => ({ ...prev, isPlaying: true, isFetching: false }));
      el.onpause = () => setState(prev => ({ ...prev, isPlaying: false }));
      el.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        releaseCurrentBlob();
      };
      el.onerror = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          errorMessage: 'Audio playback failed.',
        }));
        releaseCurrentBlob();
      };
      await el.play();
    } catch (err) {
      setState(prev => ({
        ...prev,
        isFetching: false,
        errorMessage: classifyVoiceError(err),
      }));
    }
  }, [stop, releaseCurrentBlob]);

  return {
    speak,
    stop,
    isPlaying: state.isPlaying,
    isFetching: state.isFetching,
    errorMessage: state.errorMessage,
  };
}
