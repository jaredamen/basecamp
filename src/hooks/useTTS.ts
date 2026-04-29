import { useEffect, useRef, useState } from 'react';

/**
 * Minimal browser-speech-synthesis wrapper. Used as the *fallback* path —
 * the OS robot voice — when OpenAI nova isn't available. The product voice
 * is OpenAI nova via /api/proxy/tts; see useNovaTTS.
 *
 * No personalities, no intros, no localStorage settings. Just speak + stop.
 */

const VOICE_RATE = 1.0;
const VOICE_PITCH = 1.0;
const VOICE_VOLUME = 0.85;

interface TTSState {
  isReading: boolean;
  /** Tuning constants for the browser fallback. AudioPlayer's legacy code
   *  reads these into a ref to apply to a custom utterance. */
  voiceSettings: { rate: number; pitch: number; volume: number };
}

export const useTTS = () => {
  const [ttsState, setTTSState] = useState<TTSState>({
    isReading: false,
    voiceSettings: { rate: VOICE_RATE, pitch: VOICE_PITCH, volume: VOICE_VOLUME },
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!text.trim()) return;
    if (utteranceRef.current) window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = VOICE_RATE;
    utterance.pitch = VOICE_PITCH;
    utterance.volume = VOICE_VOLUME;

    utterance.onstart = () => setTTSState(prev => ({ ...prev, isReading: true }));
    utterance.onend = () => setTTSState(prev => ({ ...prev, isReading: false }));
    utterance.onerror = () => setTTSState(prev => ({ ...prev, isReading: false }));

    utteranceRef.current = utterance;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
  };

  const resume = () => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setTTSState(prev => ({ ...prev, isReading: false }));
  };

  return {
    ttsState,
    speak,
    pause,
    resume,
    stop,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
};
