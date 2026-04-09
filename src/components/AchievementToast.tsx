import { useState, useEffect } from 'react';
import type { Achievement } from '../types/profile';
import type { VoicePersonality } from '../types';
import { getCelebrationMessage } from '../types/achievements';
import { useTTS } from '../hooks/useTTS';

interface AchievementToastProps {
  achievement: Achievement;
  voicePersonality: VoicePersonality;
  onDismiss: () => void;
  onCelebrate?: () => void;
}

export function AchievementToast({ 
  achievement, 
  voicePersonality, 
  onDismiss,
  onCelebrate 
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  const { speak, ttsState } = useTTS();

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-play celebration message
    if (!hasSpoken && isVisible) {
      const celebrationText = getCelebrationMessage(achievement.id, voicePersonality);
      speak(celebrationText);
      setHasSpoken(true);
      onCelebrate?.();
    }
  }, [isVisible, hasSpoken, achievement.id, voicePersonality, speak, onCelebrate]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  const handleReplayCelebration = () => {
    const celebrationText = getCelebrationMessage(achievement.id, voicePersonality);
    speak(celebrationText);
  };

  const getTypeStyles = () => {
    switch (achievement.type) {
      case 'streak':
        return 'from-orange-500 to-red-500 border-orange-500/50';
      case 'mastery':
        return 'from-blue-500 to-purple-500 border-blue-500/50';
      case 'exploration':
        return 'from-green-500 to-teal-500 border-green-500/50';
      case 'special':
        return 'from-yellow-500 to-pink-500 border-yellow-500/50';
      default:
        return 'from-gray-500 to-gray-600 border-gray-500/50';
    }
  };

  const getPersonalityEmoji = () => {
    switch (voicePersonality) {
      case 'peter-griffin':
        return '🍺';
      case 'motivational':
        return '💪';
      case 'asmr':
        return '😌';
      default:
        return '🎉';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`} />

      {/* Toast Container */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className={`bg-gradient-to-br ${getTypeStyles()} p-1 rounded-2xl max-w-sm w-full 
                        transform transition-all duration-500 ${isVisible ? 'animate-pulse' : ''}`}>
          
          <div className="bg-dark-900 rounded-2xl p-6 space-y-4">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="text-4xl">{achievement.icon}</div>
              <div className="text-2xl">{getPersonalityEmoji()}</div>
              <h3 className="text-xl font-bold text-white">Achievement Unlocked!</h3>
            </div>

            {/* Achievement Details */}
            <div className="text-center space-y-2">
              <h4 className="text-lg font-semibold text-dark-100">{achievement.title}</h4>
              <p className="text-sm text-dark-300">{achievement.description}</p>
              
              {/* Celebration Message */}
              <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                <p className="text-sm text-dark-200 italic">
                  "{getCelebrationMessage(achievement.id, voicePersonality)}"
                </p>
                <div className="text-xs text-dark-500 mt-1">
                  — Your {voicePersonality === 'peter-griffin' ? 'buddy Peter' : 
                           voicePersonality === 'motivational' ? 'coach' :
                           voicePersonality === 'asmr' ? 'guide' : 'assistant'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReplayCelebration}
                disabled={ttsState.isReading}
                className="flex-1 bg-dark-800 text-dark-200 py-3 px-4 rounded-lg 
                         hover:bg-dark-700 disabled:opacity-50 transition-all
                         flex items-center justify-center gap-2"
              >
                {ttsState.isReading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin"/>
                    Playing...
                  </>
                ) : (
                  <>
                    🔊 Replay
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className={`flex-1 bg-gradient-to-r ${getTypeStyles()} text-white py-3 px-4 rounded-lg 
                          hover:brightness-110 transition-all font-semibold`}
              >
                Awesome! 🎉
              </button>
            </div>

            {/* Achievement Metadata */}
            <div className="text-center text-xs text-dark-500 space-y-1">
              <div>Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}</div>
              <div className="flex justify-center items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                <span>Achievement #{achievement.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti Effect (CSS animation) */}
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['🎉', '✨', '🎊', '🌟', '💫'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Mini achievement notification for less intrusive celebrations
export function AchievementMini({ 
  achievement, 
  voicePersonality, 
  onDismiss 
}: Omit<AchievementToastProps, 'onCelebrate'>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-40 transition-all duration-300 ${
      isVisible ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-full opacity-0'
    }`}>
      <div 
        onClick={handleClick}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg 
                   shadow-lg border border-blue-500/30 cursor-pointer hover:brightness-110 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{achievement.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{achievement.title}</div>
            <div className="text-sm opacity-90 truncate">{achievement.description}</div>
          </div>
          <div className="text-lg">
            {voicePersonality === 'peter-griffin' ? '🍺' : '🎉'}
          </div>
        </div>
      </div>
    </div>
  );
}