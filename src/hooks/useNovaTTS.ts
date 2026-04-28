import { useCallback, useEffect, useRef, useState } from 'react';
import { proxyTTS, InsufficientCreditsError } from '../services/managedProxy';

/** Single product voice. OpenAI's "nova" — natural, warm, conversational. */
const PRODUCT_VOICE = 'nova';

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
      const { audioBlob } = await proxyTTS({ text: text.slice(0, 4096), voice: PRODUCT_VOICE });
      const url = URL.createObjectURL(audioBlob);
      currentBlobUrlRef.current = url;

      const el = audioElRef.current;
      if (!el) {
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
        setState(prev => ({ ...prev, isPlaying: false }));
        releaseCurrentBlob();
        speakViaBrowser(text);
      };
      await el.play();
    } catch (err) {
      // Network / auth / blob-play failures — fall back to browser speech.
      // 402 (out of credits) is surfaced in errorMessage so the UI can
      // disable further reads or show a top-up prompt; we still attempt
      // the browser fallback so the user gets something.
      const errorMessage =
        err instanceof InsufficientCreditsError
          ? 'Out of credits. Top up to keep reading aloud.'
          : null;
      setState(prev => ({ ...prev, isFetching: false, errorMessage }));
      speakViaBrowser(text);
    }
  }, [stop, speakViaBrowser, releaseCurrentBlob]);

  return {
    speak,
    stop,
    isPlaying: state.isPlaying,
    isFetching: state.isFetching,
    errorMessage: state.errorMessage,
  };
}
