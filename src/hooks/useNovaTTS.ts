import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVoiceAudio, InsufficientCreditsError } from '../services/voiceTTS';
import { useBYOK } from './useBYOK';

/**
 * Convert an error from the proxy into a single-sentence user-visible message
 * explaining why the high-quality voice isn't playing right now. Always returns
 * a string — silent fallback to the browser robot voice is forbidden.
 */
function classifyVoiceError(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return 'Out of credits. Add a payment method to continue with the high-quality voice.';
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

interface NovaTTSState {
  /** True from the moment .speak() is called until audio actually starts playing. */
  isFetching: boolean;
  /** True while the audio is sounding through the speakers. */
  isPlaying: boolean;
  /** Set to "out of credits" or similar when the proxy returns an error.
   *  Cleared on the next successful speak(). */
  errorMessage: string | null;
}

/**
 * Single-shot TTS hook for short reads (a flashcard, a hint, a button).
 * Calls /api/proxy/tts with voice='nova', plays the returned MP3 via an
 * HTMLAudioElement, falls back to browser SpeechSynthesis if the proxy
 * call fails (no auth, network error, etc.).
 *
 * For long-form briefings with section gating + checkpoint prefetch,
 * AudioPlayer manages its own playback path — don't use this hook there.
 */
export function useNovaTTS() {
  const [state, setState] = useState<NovaTTSState>({
    isFetching: false,
    isPlaying: false,
    errorMessage: null,
  });

  const { config, isManaged } = useBYOK();
  // BYOK users with an OpenAI key call OpenAI directly for nova; managed users
  // go through /api/proxy/tts. Both surfaces hand back an MP3 Blob.
  const byokOpenAIKey =
    !isManaged && config?.aiProvider?.id === 'openai'
      ? config.aiProvider.apiKey
      : undefined;

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
      window.speechSynthesis.cancel();
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
    window.speechSynthesis.cancel();
    releaseCurrentBlob();
    setState(prev => ({ ...prev, isPlaying: false, isFetching: false }));
  }, [releaseCurrentBlob]);

  const speakViaBrowser = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setState(prev => ({ ...prev, isPlaying: true, isFetching: false }));
    utterance.onend = () => setState(prev => ({ ...prev, isPlaying: false }));
    utterance.onerror = () => setState(prev => ({ ...prev, isPlaying: false }));
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stop();
    setState(prev => ({ ...prev, isFetching: true, errorMessage: null }));

    try {
      const audioBlob = await fetchVoiceAudio(text, byokOpenAIKey);
      const url = URL.createObjectURL(audioBlob);
      currentBlobUrlRef.current = url;

      const el = audioElRef.current;
      if (!el) {
        setState(prev => ({ ...prev, errorMessage: 'Audio playback unavailable. Using browser voice.' }));
        speakViaBrowser(text);
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
          errorMessage: 'Audio playback failed. Using browser voice.',
        }));
        releaseCurrentBlob();
        speakViaBrowser(text);
      };
      await el.play();
    } catch (err) {
      // Network / auth / blob-play failures — fall back to browser speech but
      // tell the user *why* the high-quality voice isn't playing. Silent
      // degradation to the OS robot is the worst possible UX.
      setState(prev => ({ ...prev, isFetching: false, errorMessage: classifyVoiceError(err) }));
      speakViaBrowser(text);
    }
  }, [stop, speakViaBrowser, releaseCurrentBlob, byokOpenAIKey]);

  return {
    speak,
    stop,
    isPlaying: state.isPlaying,
    isFetching: state.isFetching,
    errorMessage: state.errorMessage,
  };
}
