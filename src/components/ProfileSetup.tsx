import { useState } from 'react';
import type { VoicePersonality } from '../types';
import type { StudyDifficulty, StudyTimePreference } from '../types/profile';

interface ProfileSetupProps {
  onComplete: (profileData: {
    displayName?: string;
    preferredVoice: VoicePersonality;
    studySessionLength: number;
    difficultyPreference: StudyDifficulty;
    studyTimePreference?: StudyTimePreference;
  }) => void;
  onSkip: () => void;
}

const VOICE_OPTIONS = [
  {
    id: 'standard' as const,
    name: 'Standard',
    description: 'Clear and professional voice',
    icon: '🗣️',
    sample: 'Hello! I\'ll help you study with clear pronunciation.'
  },
  {
    id: 'peter-griffin' as const,
    name: 'Peter Griffin',
    description: 'Fun and entertaining voice',
    icon: '🍺',
    sample: 'Holy crap! This is gonna be freakin\' awesome!'
  },
  {
    id: 'motivational' as const,
    name: 'Motivational Coach',
    description: 'Energetic and encouraging voice',
    icon: '💪',
    sample: 'YES! You\'re about to CRUSH these study goals!'
  },
  {
    id: 'asmr' as const,
    name: 'ASMR',
    description: 'Soft and calming voice',
    icon: '😴',
    sample: 'Welcome... to a peaceful learning experience...'
  }
];

const SESSION_LENGTHS = [
  { value: 5, label: '5 minutes', description: 'Quick sessions' },
  { value: 10, label: '10 minutes', description: 'Recommended' },
  { value: 15, label: '15 minutes', description: 'Focused learning' },
  { value: 30, label: '30 minutes', description: 'Deep dive' }
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy' as const, label: 'Easy Start', description: 'Gentle learning pace' },
  { id: 'mixed' as const, label: 'Mixed', description: 'Balanced challenge (Recommended)' },
  { id: 'challenging' as const, label: 'Challenge Me', description: 'Push my limits' }
];

const TIME_PREFERENCES = [
  { id: 'morning' as const, label: 'Morning Person', icon: '🌅' },
  { id: 'afternoon' as const, label: 'Afternoon Learner', icon: '☀️' },
  { id: 'evening' as const, label: 'Night Owl', icon: '🌙' },
  { id: 'flexible' as const, label: 'Whenever I Can', icon: '🕐' }
];

export function ProfileSetup({ onComplete, onSkip }: ProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoicePersonality>('standard');
  const [sessionLength, setSessionLength] = useState(10);
  const [difficulty, setDifficulty] = useState<StudyDifficulty>('mixed');
  const [timePreference, setTimePreference] = useState<StudyTimePreference | undefined>();
  const [playingVoice, setPlayingVoice] = useState<VoicePersonality | null>(null);

  const totalSteps = 4;

  const playVoiceSample = (voiceId: VoicePersonality) => {
    const voiceOption = VOICE_OPTIONS.find(v => v.id === voiceId);
    if (!voiceOption) return;

    setPlayingVoice(voiceId);
    
    // Use the same TTS logic as the rest of the app
    const utterance = new SpeechSynthesisUtterance(voiceOption.sample);
    
    // Apply voice-specific settings
    switch (voiceId) {
      case 'peter-griffin':
        utterance.pitch = 0.8;
        utterance.rate = 1.1;
        break;
      case 'motivational':
        utterance.pitch = 1.2;
        utterance.rate = 1.3;
        utterance.volume = 0.9;
        break;
      case 'asmr':
        utterance.pitch = 0.9;
        utterance.rate = 0.7;
        utterance.volume = 0.7;
        break;
      default:
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        utterance.volume = 0.8;
    }

    utterance.onend = () => setPlayingVoice(null);
    
    speechSynthesis.cancel(); // Stop any current speech
    speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    onComplete({
      displayName: displayName.trim() || undefined,
      preferredVoice: selectedVoice,
      studySessionLength: sessionLength,
      difficultyPreference: difficulty,
      studyTimePreference: timePreference
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-dark-100">What should we call you?</h2>
              <p className="text-dark-400">This helps us personalize your experience (optional)</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name or nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-4 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 
                         placeholder-dark-500 focus:border-blue-500 focus:outline-none"
                maxLength={30}
              />
              <p className="text-sm text-dark-500">
                {displayName.trim() ? `Great! We'll call you ${displayName.trim()}` : 'Or skip this step'}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-dark-100">Choose Your Study Voice</h2>
              <p className="text-dark-400">Pick a voice personality that motivates you</p>
            </div>

            <div className="grid gap-4">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedVoice === voice.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{voice.icon}</span>
                        <span className="font-semibold text-dark-100">{voice.name}</span>
                      </div>
                      <p className="text-sm text-dark-400">{voice.description}</p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoiceSample(voice.id);
                      }}
                      className="p-2 rounded bg-dark-700 hover:bg-dark-600 transition-colors"
                      disabled={playingVoice !== null}
                    >
                      {playingVoice === voice.id ? (
                        <span className="text-green-400">🔊</span>
                      ) : (
                        <span className="text-dark-300">▶️</span>
                      )}
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {playingVoice && (
              <div className="text-center">
                <p className="text-sm text-green-400">
                  🔊 Playing voice sample... 
                  <button 
                    onClick={() => speechSynthesis.cancel()}
                    className="ml-2 text-red-400 hover:underline"
                  >
                    Stop
                  </button>
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-dark-100">Study Preferences</h2>
              <p className="text-dark-400">Help us customize your learning experience</p>
            </div>

            <div className="space-y-6">
              {/* Session Length */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-dark-100">How long do you want to study?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SESSION_LENGTHS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSessionLength(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        sessionLength === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-dark-100">{option.label}</div>
                        <div className="text-sm text-dark-400">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-dark-100">Learning pace</h3>
                <div className="space-y-2">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDifficulty(option.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        difficulty === option.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                      }`}
                    >
                      <div className="font-semibold text-dark-100">{option.label}</div>
                      <div className="text-sm text-dark-400">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-dark-100">When do you learn best?</h2>
              <p className="text-dark-400">We'll send gentle reminders at your preferred time</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TIME_PREFERENCES.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTimePreference(option.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    timePreference === option.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="text-sm font-semibold text-dark-100">{option.label}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm text-dark-500">
                You can always change these preferences later in settings
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-dark-800 h-2">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-dark-800">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="text-sm text-dark-500">
            Step {step} of {totalSteps}
          </div>

          <div className="flex gap-3">
            {step === 1 && (
              <button
                onClick={onSkip}
                className="px-4 py-2 text-dark-400 hover:text-dark-300 transition-colors"
              >
                Skip setup
              </button>
            )}

            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {step === totalSteps ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}