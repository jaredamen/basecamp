import React from 'react';
import type { VoicePersonality } from '../types';
import { useTTS } from '../hooks/useTTS';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const VoicePersonalityIcon: React.FC<{ personality: VoicePersonality }> = ({ personality }) => {
  switch (personality) {
    case 'peter-griffin':
      return <span className="text-2xl">🍺</span>;
    case 'motivational':
      return <span className="text-2xl">💪</span>;
    case 'asmr':
      return <span className="text-2xl">😴</span>;
    default:
      return <span className="text-2xl">🔊</span>;
  }
};

const getPersonalityDescription = (personality: VoicePersonality): string => {
  switch (personality) {
    case 'peter-griffin':
      return 'Nyehehehe! Fun voice with catchphrases';
    case 'motivational':
      return 'Energetic and encouraging tone';
    case 'asmr':
      return 'Soft, calming voice for relaxation';
    default:
      return 'Standard clear voice';
  }
};

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({ isOpen, onClose }) => {
  const {
    ttsState,
    updateVoiceSettings,
    setVoicePersonality,
    getVoicesByLanguage,
    getRecommendedVoice,
    speak,
    isSupported,
  } = useTTS();

  const voicePersonalities: VoicePersonality[] = ['standard', 'peter-griffin', 'motivational', 'asmr'];
  const voicesByLanguage = getVoicesByLanguage();

  const testVoice = () => {
    const testText = ttsState.voiceSettings.personality === 'peter-griffin' 
      ? "Holy crap, this is how I sound!" 
      : "This is how your selected voice sounds.";
    speak(testText, true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">Voice Settings</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {!isSupported && (
            <div className="bg-red-600/20 border border-red-600/30 text-red-400 p-3 rounded-lg">
              <p className="text-sm">Text-to-speech is not supported in your browser.</p>
            </div>
          )}

          {/* Voice Personality Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-3">
              Voice Personality
            </label>
            <div className="grid grid-cols-2 gap-3">
              {voicePersonalities.map((personality) => (
                <button
                  key={personality}
                  onClick={() => setVoicePersonality(personality)}
                  className={`p-3 rounded-lg border transition-all ${
                    ttsState.voiceSettings.personality === personality
                      ? 'border-blue-500 bg-blue-600/20 text-blue-200'
                      : 'border-dark-600 bg-dark-700 text-dark-300 hover:border-dark-500'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <VoicePersonalityIcon personality={personality} />
                    <div className="text-center">
                      <div className="text-sm font-medium capitalize">
                        {personality.replace('-', ' ')}
                      </div>
                      <div className="text-xs text-dark-400 mt-1">
                        {getPersonalityDescription(personality)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* System Voice Selection */}
          {Object.keys(voicesByLanguage).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                System Voice
              </label>
              <select
                value={ttsState.voiceSettings.systemVoice || ''}
                onChange={(e) => updateVoiceSettings({ systemVoice: e.target.value || undefined })}
                className="w-full bg-dark-700 border border-dark-600 text-dark-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Auto (Recommended)</option>
                {Object.entries(voicesByLanguage).map(([lang, voices]) => (
                  <optgroup key={lang} label={`${lang.toUpperCase()} Voices`}>
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-dark-400 mt-1">
                Recommended: {getRecommendedVoice()?.name || 'Default'}
              </p>
            </div>
          )}

          {/* Voice Controls */}
          <div className="space-y-4">
            {/* Speaking Rate */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Speaking Rate: {ttsState.voiceSettings.rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsState.voiceSettings.rate}
                onChange={(e) => updateVoiceSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Pitch */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Pitch: {ttsState.voiceSettings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsState.voiceSettings.pitch}
                onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Volume: {Math.round(ttsState.voiceSettings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={ttsState.voiceSettings.volume}
                onChange={(e) => updateVoiceSettings({ volume: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={testVoice}
            disabled={!isSupported || ttsState.isReading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:text-dark-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            {ttsState.isReading ? 'Speaking...' : 'Test Voice'}
          </button>

          {/* Peter Griffin Special Note */}
          {ttsState.voiceSettings.personality === 'peter-griffin' && (
            <div className="bg-orange-600/20 border border-orange-600/30 text-orange-300 p-3 rounded-lg">
              <p className="text-sm">
                🍺 Peter Griffin mode activated! You'll hear fun catchphrases when reading content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};