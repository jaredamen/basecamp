import { useState, useEffect } from 'react';
import { useTTS } from '../hooks/useTTS';
import type { VoicePersonality } from '../types';

interface FeatureDemoProps {
  onComplete: () => void;
  onSkip: () => void;
}

const DEMO_FLASHCARD = {
  id: 'demo-card',
  question: 'What makes Kubernetes pods special?',
  answer: 'Pods are the smallest deployable units that can contain one or more containers sharing the same network and storage.'
};

const VOICE_DEMOS = [
  {
    id: 'standard' as VoicePersonality,
    name: 'Standard Voice',
    icon: '🗣️',
    description: 'Clear and professional',
    phrase: 'Welcome to Basecamp! Let me read this flashcard for you.'
  },
  {
    id: 'peter-griffin' as VoicePersonality,
    name: 'Peter Griffin',
    icon: '🍺',
    description: 'Fun and entertaining',
    phrase: 'Holy crap! This Kubernetes stuff is freakin\' awesome! Let me tell ya about pods!'
  },
  {
    id: 'motivational' as VoicePersonality,
    name: 'Motivational Coach',
    icon: '💪',
    description: 'Energetic and encouraging',
    phrase: 'YES! You\'re about to MASTER this concept! Let\'s CRUSH this learning goal!'
  },
  {
    id: 'asmr' as VoicePersonality,
    name: 'ASMR Voice',
    icon: '😴',
    description: 'Soft and calming',
    phrase: 'Welcome to a peaceful learning experience... let\'s gently explore this topic...'
  }
];

const DEMO_STEPS = [
  {
    id: 'flashcard',
    title: 'Smart Flashcards',
    description: 'AI-generated cards from any content',
    icon: '🧠'
  },
  {
    id: 'voices',
    title: 'Fun Voices',
    description: 'Choose personalities that motivate you',
    icon: '🎭'
  },
  {
    id: 'features',
    title: 'Powerful Features',
    description: 'Progress tracking, achievements, and more',
    icon: '🚀'
  }
];

export function FeatureDemo({ onComplete, onSkip }: FeatureDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoicePersonality>('standard');
  const [hasTriedVoice, setHasTriedVoice] = useState(false);
  
  const { speak, ttsState, updateVoiceSettings } = useTTS();

  useEffect(() => {
    updateVoiceSettings({ personality: selectedVoice });
  }, [selectedVoice, updateVoiceSettings]);

  const handlePlayVoiceDemo = (voiceId: VoicePersonality) => {
    const voiceDemo = VOICE_DEMOS.find(v => v.id === voiceId);
    if (!voiceDemo) return;

    setSelectedVoice(voiceId);
    speak(voiceDemo.phrase);
    setHasTriedVoice(true);
  };

  const handleReadFlashcard = () => {
    const textToRead = showAnswer 
      ? `Question: ${DEMO_FLASHCARD.question}. Answer: ${DEMO_FLASHCARD.answer}`
      : DEMO_FLASHCARD.question;
    
    speak(textToRead);
    setHasTriedVoice(true);
  };

  const handleNext = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (DEMO_STEPS[currentStep].id) {
      case 'flashcard':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-dark-100">Experience Smart Flashcards</h3>
              <p className="text-dark-400">Here's a real flashcard from our sample content</p>
            </div>

            {/* Demo Flashcard */}
            <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-600/20 px-4 py-3 border-b border-dark-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-300">Kubernetes Deck</span>
                  <span className="text-xs text-dark-400">Card 1 of 15</span>
                </div>
              </div>

              {/* Question */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-dark-300">Question:</label>
                  <p className="text-lg text-dark-100">{DEMO_FLASHCARD.question}</p>
                </div>

                {/* Answer (conditional) */}
                {showAnswer && (
                  <div className="space-y-2 border-t border-dark-700 pt-4">
                    <label className="text-sm font-semibold text-dark-300">Answer:</label>
                    <p className="text-dark-100">{DEMO_FLASHCARD.answer}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleReadFlashcard}
                    disabled={ttsState.isReading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                             hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {ttsState.isReading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                        Reading...
                      </>
                    ) : (
                      <>
                        🔊 Read Aloud
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex-1 px-4 py-2 bg-dark-700 text-dark-200 rounded-lg 
                             hover:bg-dark-600 transition-colors"
                  >
                    {showAnswer ? 'Hide Answer' : 'Show Answer'}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-dark-400">
                {hasTriedVoice ? (
                  <span className="text-green-400">✓ Great! You tried the voice feature!</span>
                ) : (
                  'Try the "Read Aloud" button above!'
                )}
              </p>
            </div>
          </div>
        );

      case 'voices':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-dark-100">Choose Your Voice Personality</h3>
              <p className="text-dark-400">Pick one that motivates you most!</p>
            </div>

            <div className="space-y-3">
              {VOICE_DEMOS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handlePlayVoiceDemo(voice.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedVoice === voice.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                  disabled={ttsState.isReading}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{voice.icon}</span>
                        <span className="font-semibold text-dark-100">{voice.name}</span>
                      </div>
                      <p className="text-sm text-dark-400">{voice.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {selectedVoice === voice.id && ttsState.isReading && (
                        <span className="text-green-400">🔊</span>
                      )}
                      <span className="text-dark-400">▶️</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {ttsState.isReading && (
              <div className="text-center">
                <p className="text-sm text-green-400">
                  🎵 Playing voice sample...
                  <button 
                    onClick={() => speechSynthesis.cancel()}
                    className="ml-2 text-red-400 hover:underline"
                  >
                    Stop
                  </button>
                </p>
              </div>
            )}

            {hasTriedVoice && (
              <div className="text-center p-3 bg-green-600/20 border border-green-600/30 rounded-lg">
                <p className="text-sm text-green-400">
                  ✨ Awesome! You found your voice preference!
                </p>
              </div>
            )}
          </div>
        );

      case 'features':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-dark-100">Powerful Learning Features</h3>
              <p className="text-dark-400">Everything you need to succeed</p>
            </div>

            <div className="space-y-4">
              {/* Progress Tracking */}
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-dark-100">Progress Tracking</h4>
                    <p className="text-sm text-dark-400">
                      Track your study streaks, accuracy rates, and total cards mastered
                    </p>
                    <div className="bg-dark-700 rounded p-2 text-xs">
                      <div className="flex justify-between text-dark-300">
                        <span>Study Streak</span>
                        <span className="text-orange-400">🔥 7 days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🏆</div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-dark-100">Achievement System</h4>
                    <p className="text-sm text-dark-400">
                      Unlock badges and celebrations as you progress
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
                        🔥 Week Warrior
                      </span>
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        🎭 Voice Explorer
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Offline Mode */}
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📱</div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-dark-100">Study Anywhere</h4>
                    <p className="text-sm text-dark-400">
                      Works offline, responsive design, and PWA support
                    </p>
                    <div className="flex gap-3 text-xs text-dark-400">
                      <span>✓ Offline Mode</span>
                      <span>✓ Mobile Optimized</span>
                      <span>✓ Install as App</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
              <p className="text-blue-300 font-semibold">
                🚀 Ready to start your learning journey?
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
      {/* Progress indicator */}
      <div className="w-full bg-dark-800 h-2">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / DEMO_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-dark-800">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{DEMO_STEPS[currentStep].icon}</div>
            <div>
              <h2 className="text-lg font-bold text-dark-100">
                {DEMO_STEPS[currentStep].title}
              </h2>
              <p className="text-sm text-dark-400">
                {DEMO_STEPS[currentStep].description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-dark-800">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="text-sm text-dark-500">
            {currentStep + 1} of {DEMO_STEPS.length}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-dark-400 hover:text-dark-300 transition-colors"
            >
              Skip Demo
            </button>

            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg 
                       hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              {currentStep === DEMO_STEPS.length - 1 ? 'Start Learning!' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}