import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceSettings, VoicePersonality, TTSState } from '../types';

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  personality: 'standard',
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
};

const PETER_GRIFFIN_PHRASES = [
  "Holy crap, that's interesting!",
  "Nyehehehe, let me read this for ya!",
  "This is freakin' sweet!",
  "Alright, listen up!",
  "Oh my God, who the hell cares... just kidding!",
];

const getVoicePersonalitySettings = (personality: VoicePersonality): Partial<VoiceSettings> => {
  switch (personality) {
    case 'peter-griffin':
      return {
        rate: 0.9,
        pitch: 0.7, // Lower pitch for Peter Griffin effect
        volume: 0.9,
      };
    case 'motivational':
      return {
        rate: 1.1,
        pitch: 1.2,
        volume: 1.0,
      };
    case 'asmr':
      return {
        rate: 0.8,
        pitch: 0.9,
        volume: 0.6,
      };
    default:
      return {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
      };
  }
};

const getRandomPhrase = (phrases: string[]): string => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const getInitialVoiceSettings = (): VoiceSettings => {
  const savedSettings = localStorage.getItem('basecamp-voice-settings');
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      return { ...DEFAULT_VOICE_SETTINGS, ...parsedSettings };
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  }
  return DEFAULT_VOICE_SETTINGS;
};

export const useTTS = () => {
  const [ttsState, setTTSState] = useState<TTSState>({
    isReading: false,
    voiceSettings: getInitialVoiceSettings(),
    availableVoices: [],
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setTTSState(prev => ({ ...prev, availableVoices: voices }));
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Save voice settings to localStorage
  const saveVoiceSettings = useCallback((settings: VoiceSettings) => {
    localStorage.setItem('basecamp-voice-settings', JSON.stringify(settings));
    setTTSState(prev => ({ ...prev, voiceSettings: settings }));
  }, []);

  const updateVoiceSettings = useCallback((updates: Partial<VoiceSettings>) => {
    const newSettings = { ...ttsState.voiceSettings, ...updates };
    saveVoiceSettings(newSettings);
  }, [ttsState.voiceSettings, saveVoiceSettings]);

  const setVoicePersonality = useCallback((personality: VoicePersonality) => {
    const personalitySettings = getVoicePersonalitySettings(personality);
    const newSettings = {
      ...ttsState.voiceSettings,
      personality,
      ...personalitySettings,
    };
    saveVoiceSettings(newSettings);
  }, [ttsState.voiceSettings, saveVoiceSettings]);

  const speak = useCallback((text: string, withIntro: boolean = false) => {
    // Stop any current speech
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
    }

    // Prepare text with personality intro if requested
    let textToSpeak = text;
    if (withIntro && ttsState.voiceSettings.personality === 'peter-griffin') {
      const intro = getRandomPhrase(PETER_GRIFFIN_PHRASES);
      textToSpeak = `${intro} ${text}`;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Apply voice settings
    utterance.rate = ttsState.voiceSettings.rate;
    utterance.pitch = ttsState.voiceSettings.pitch;
    utterance.volume = ttsState.voiceSettings.volume;

    // Set voice if specified
    if (ttsState.voiceSettings.systemVoice) {
      const voice = ttsState.availableVoices.find(
        v => v.name === ttsState.voiceSettings.systemVoice
      );
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Set up event handlers
    utterance.onstart = () => {
      setTTSState(prev => ({ ...prev, isReading: true, currentText: text }));
    };

    utterance.onend = () => {
      setTTSState(prev => ({ ...prev, isReading: false, currentText: undefined }));
    };

    utterance.onerror = (error) => {
      console.error('TTS Error:', error);
      setTTSState(prev => ({ ...prev, isReading: false, currentText: undefined }));
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsState.voiceSettings, ttsState.availableVoices]);

  const speakFlashcard = useCallback((question: string, answer: string, readBoth: boolean = false) => {
    if (readBoth) {
      const combined = `Question: ${question}. Answer: ${answer}`;
      speak(combined, true);
    } else {
      speak(question, true);
    }
  }, [speak]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setTTSState(prev => ({ ...prev, isReading: false, currentText: undefined }));
  }, []);

  // Get available system voices grouped by language
  const getVoicesByLanguage = useCallback(() => {
    const voicesByLang: { [key: string]: SpeechSynthesisVoice[] } = {};
    
    ttsState.availableVoices.forEach(voice => {
      const lang = voice.lang.split('-')[0]; // e.g., 'en' from 'en-US'
      if (!voicesByLang[lang]) {
        voicesByLang[lang] = [];
      }
      voicesByLang[lang].push(voice);
    });

    return voicesByLang;
  }, [ttsState.availableVoices]);

  // Get recommended voice for current personality
  const getRecommendedVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    const englishVoices = ttsState.availableVoices.filter(v => v.lang.startsWith('en'));
    
    switch (ttsState.voiceSettings.personality) {
      case 'peter-griffin':
        // Prefer male voices with lower pitch capability
        return englishVoices.find(v => v.name.toLowerCase().includes('male')) || 
               englishVoices.find(v => v.name.toLowerCase().includes('david')) ||
               englishVoices[0];
      case 'motivational':
        // Prefer energetic-sounding voices
        return englishVoices.find(v => v.name.toLowerCase().includes('alex')) ||
               englishVoices.find(v => v.name.toLowerCase().includes('daniel')) ||
               englishVoices[0];
      case 'asmr':
        // Prefer soft female voices
        return englishVoices.find(v => v.name.toLowerCase().includes('female')) ||
               englishVoices.find(v => v.name.toLowerCase().includes('samantha')) ||
               englishVoices[0];
      default:
        return englishVoices[0];
    }
  }, [ttsState.availableVoices, ttsState.voiceSettings.personality]);

  return {
    ttsState,
    speak,
    speakFlashcard,
    pause,
    resume,
    stop,
    updateVoiceSettings,
    setVoicePersonality,
    getVoicesByLanguage,
    getRecommendedVoice,
    isSupported: 'speechSynthesis' in window,
  };
};