import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTTS } from '../useTTS';
import type { VoicePersonality } from '../../types';

// Mock speechSynthesis API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'Alex', lang: 'en-US' },
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Daniel', lang: 'en-GB' }
  ]),
  speaking: false,
  paused: false,
  onvoiceschanged: null
};

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
  text: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: null,
  onstart: null,
  onend: null,
  onerror: null
}));

// Setup global mocks
Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true
});

Object.defineProperty(global, 'SpeechSynthesisUtterance', {
  value: mockSpeechSynthesisUtterance,
  writable: true
});

describe('useTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.paused = false;
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useTTS());

      expect(result.current.ttsState.isReading).toBe(false);
      expect(result.current.ttsState.voiceSettings.personality).toBe('standard');
      expect(result.current.ttsState.voiceSettings.rate).toBe(1.0);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(1.0);
      expect(result.current.ttsState.voiceSettings.volume).toBe(0.8);
    });

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        personality: 'peter-griffin' as VoicePersonality,
        rate: 1.2,
        pitch: 0.8,
        volume: 0.9
      };
      localStorage.setItem('basecamp-voice-settings', JSON.stringify(savedSettings));

      const { result } = renderHook(() => useTTS());

      expect(result.current.ttsState.voiceSettings.personality).toBe('peter-griffin');
      expect(result.current.ttsState.voiceSettings.rate).toBe(1.2);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(0.8);
      expect(result.current.ttsState.voiceSettings.volume).toBe(0.9);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem('basecamp-voice-settings', 'invalid-json');

      const { result } = renderHook(() => useTTS());

      expect(result.current.ttsState.voiceSettings.personality).toBe('standard');
    });

    it('should load available voices', async () => {
      const { result } = renderHook(() => useTTS());

      await waitFor(() => {
        expect(result.current.ttsState.availableVoices).toHaveLength(3);
      });
    });
  });

  describe('voice personality settings', () => {
    it('should apply Peter Griffin personality settings', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('peter-griffin');
      });

      expect(result.current.ttsState.voiceSettings.personality).toBe('peter-griffin');
      expect(result.current.ttsState.voiceSettings.rate).toBe(0.9);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(0.7);
      expect(result.current.ttsState.voiceSettings.volume).toBe(0.9);
    });

    it('should apply motivational personality settings', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('motivational');
      });

      expect(result.current.ttsState.voiceSettings.personality).toBe('motivational');
      expect(result.current.ttsState.voiceSettings.rate).toBe(1.1);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(1.2);
      expect(result.current.ttsState.voiceSettings.volume).toBe(1.0);
    });

    it('should apply ASMR personality settings', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('asmr');
      });

      expect(result.current.ttsState.voiceSettings.personality).toBe('asmr');
      expect(result.current.ttsState.voiceSettings.rate).toBe(0.8);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(0.9);
      expect(result.current.ttsState.voiceSettings.volume).toBe(0.6);
    });

    it('should save personality settings to localStorage', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('peter-griffin');
      });

      const saved = localStorage.getItem('basecamp-voice-settings');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.personality).toBe('peter-griffin');
    });
  });

  describe('voice settings updates', () => {
    it('should update individual voice settings', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.updateVoiceSettings({ rate: 1.5 });
      });

      expect(result.current.ttsState.voiceSettings.rate).toBe(1.5);
    });

    it('should update multiple voice settings at once', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.updateVoiceSettings({ 
          rate: 1.3, 
          pitch: 1.1, 
          volume: 0.7 
        });
      });

      expect(result.current.ttsState.voiceSettings.rate).toBe(1.3);
      expect(result.current.ttsState.voiceSettings.pitch).toBe(1.1);
      expect(result.current.ttsState.voiceSettings.volume).toBe(0.7);
    });
  });

  describe('text-to-speech functionality', () => {
    it('should speak text without intro', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello world', false);
      });

      expect(mockSpeechSynthesisUtterance).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should speak text with Peter Griffin intro', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('peter-griffin');
      });

      act(() => {
        result.current.speak('Hello world', true);
      });

      expect(mockSpeechSynthesisUtterance).toHaveBeenCalled();
      const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0][0];
      expect(utteranceCall).toContain('Hello world');
      // Should contain one of Peter Griffin's phrases
      expect(utteranceCall).toMatch(/(Holy crap|Nyehehehe|freakin'|Alright|Oh my God)/);
    });

    it('should speak flashcard question only', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speakFlashcard('What is React?', 'A JavaScript library', false);
      });

      expect(mockSpeechSynthesisUtterance).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should speak both flashcard question and answer', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speakFlashcard('What is React?', 'A JavaScript library', true);
      });

      expect(mockSpeechSynthesisUtterance).toHaveBeenCalled();
      const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0][0];
      expect(utteranceCall).toContain('Question: What is React?');
      expect(utteranceCall).toContain('Answer: A JavaScript library');
    });

    it('should update reading state during speech', () => {
      const { result } = renderHook(() => useTTS());
      
      act(() => {
        result.current.speak('Test text');
      });

      // Simulate speech start event
      const utteranceInstance = mockSpeechSynthesisUtterance.mock.results[0].value;
      act(() => {
        utteranceInstance.onstart?.();
      });

      expect(result.current.ttsState.isReading).toBe(true);
      expect(result.current.ttsState.currentText).toBe('Test text');
    });

    it('should clear reading state when speech ends', () => {
      const { result } = renderHook(() => useTTS());
      
      act(() => {
        result.current.speak('Test text');
      });

      const utteranceInstance = mockSpeechSynthesisUtterance.mock.results[0].value;
      
      act(() => {
        utteranceInstance.onstart?.();
      });

      expect(result.current.ttsState.isReading).toBe(true);

      act(() => {
        utteranceInstance.onend?.();
      });

      expect(result.current.ttsState.isReading).toBe(false);
      expect(result.current.ttsState.currentText).toBeUndefined();
    });
  });

  describe('speech controls', () => {
    it('should pause speech synthesis', () => {
      const { result } = renderHook(() => useTTS());
      mockSpeechSynthesis.speaking = true;

      act(() => {
        result.current.pause();
      });

      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should resume speech synthesis', () => {
      const { result } = renderHook(() => useTTS());
      mockSpeechSynthesis.paused = true;

      act(() => {
        result.current.resume();
      });

      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });

    it('should stop speech synthesis', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test text');
      });

      const utteranceInstance = mockSpeechSynthesisUtterance.mock.results[0].value;
      act(() => {
        utteranceInstance.onstart?.();
      });

      expect(result.current.ttsState.isReading).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(result.current.ttsState.isReading).toBe(false);
      expect(result.current.ttsState.currentText).toBeUndefined();
    });
  });

  describe('voice utilities', () => {
    it('should group voices by language', () => {
      const { result } = renderHook(() => useTTS());

      const voicesByLanguage = result.current.getVoicesByLanguage();

      expect(voicesByLanguage).toHaveProperty('en');
      expect(voicesByLanguage.en).toHaveLength(3);
    });

    it('should recommend appropriate voice for Peter Griffin personality', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.setVoicePersonality('peter-griffin');
      });

      const recommendedVoice = result.current.getRecommendedVoice();
      
      expect(recommendedVoice).toBeDefined();
      expect(recommendedVoice?.lang).toContain('en');
    });

    it('should indicate browser support', () => {
      const { result } = renderHook(() => useTTS());

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle speech synthesis errors gracefully', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test text');
      });

      const utteranceInstance = mockSpeechSynthesisUtterance.mock.results[0].value;
      
      act(() => {
        utteranceInstance.onstart?.();
      });

      expect(result.current.ttsState.isReading).toBe(true);

      act(() => {
        utteranceInstance.onerror?.(new Error('Speech error'));
      });

      expect(result.current.ttsState.isReading).toBe(false);
      expect(result.current.ttsState.currentText).toBeUndefined();
    });

    it('should cancel previous speech before starting new speech', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('First text');
      });

      act(() => {
        result.current.speak('Second text');
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    });
  });
});