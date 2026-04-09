import type { Achievement } from './profile';

export interface AchievementDefinition {
  id: string;
  type: 'streak' | 'mastery' | 'exploration' | 'special';
  title: string;
  description: string;
  icon: string;
  requirement: {
    type: 'streak_days' | 'cards_studied' | 'voice_personalities' | 'deck_completion' | 'accuracy' | 'special_action';
    value: number;
    additional?: any;
  };
  celebrationMessage: {
    standard: string;
    peterGriffin: string;
    motivational: string;
    asmr: string;
  };
  unlocksBehavior?: string;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak Achievements
  {
    id: 'streak_3',
    type: 'streak',
    title: 'Getting Started',
    description: 'Study for 3 days in a row',
    icon: '🔥',
    requirement: { type: 'streak_days', value: 3 },
    celebrationMessage: {
      standard: 'Great job! You\'re building a study habit!',
      peterGriffin: 'Holy crap! 3 days in a row! You\'re on fire!',
      motivational: 'YEAH! That\'s how champions are made! Keep it up!',
      asmr: 'Wonderful... three beautiful days of learning... so peaceful...'
    }
  },
  {
    id: 'streak_7',
    type: 'streak',
    title: 'Week Warrior',
    description: 'Study for 7 days in a row',
    icon: '⚡',
    requirement: { type: 'streak_days', value: 7 },
    celebrationMessage: {
      standard: 'Amazing! A full week of consistent learning!',
      peterGriffin: 'Nyehehehe! One whole freakin\' week! You\'re like a learning machine!',
      motivational: 'INCREDIBLE! You\'ve built an unstoppable momentum!',
      asmr: 'Seven days... like a gentle rhythm of learning... so soothing...'
    }
  },
  {
    id: 'streak_30',
    type: 'streak',
    title: 'Study Legend',
    description: 'Study for 30 days in a row',
    icon: '👑',
    requirement: { type: 'streak_days', value: 30 },
    celebrationMessage: {
      standard: 'Incredible! You\'ve achieved legendary consistency!',
      peterGriffin: 'HOLY CRAP ON A CRACKER! 30 DAYS! You\'re officially awesome!',
      motivational: 'LEGENDARY! You are now a TRUE LEARNING CHAMPION!',
      asmr: 'Thirty days... a beautiful month of growth... absolutely magnificent...'
    }
  },

  // Mastery Achievements
  {
    id: 'cards_10',
    type: 'mastery',
    title: 'First Steps',
    description: 'Study 10 flashcards',
    icon: '📚',
    requirement: { type: 'cards_studied', value: 10 },
    celebrationMessage: {
      standard: 'Well done! You\'ve started your learning journey!',
      peterGriffin: 'Hey, look at you! 10 cards down, you smart cookie!',
      motivational: 'YES! Every expert was once a beginner!',
      asmr: 'Ten cards... the beginning of something beautiful...'
    }
  },
  {
    id: 'cards_100',
    type: 'mastery',
    title: 'Dedicated Learner',
    description: 'Study 100 flashcards',
    icon: '🎯',
    requirement: { type: 'cards_studied', value: 100 },
    celebrationMessage: {
      standard: 'Excellent! 100 cards shows real dedication!',
      peterGriffin: 'Holy moly! 100 cards! You\'re getting freakin\' smart!',
      motivational: 'OUTSTANDING! You\'re building real knowledge!',
      asmr: 'One hundred cards... such dedication... so inspiring...'
    }
  },
  {
    id: 'cards_500',
    type: 'mastery',
    title: 'Knowledge Seeker',
    description: 'Study 500 flashcards',
    icon: '🧠',
    requirement: { type: 'cards_studied', value: 500 },
    celebrationMessage: {
      standard: 'Incredible! You\'ve mastered 500 cards!',
      peterGriffin: 'WHAT?! 500 cards?! You\'re like a walking encyclopedia!',
      motivational: 'PHENOMENAL! You\'ve unlocked serious brainpower!',
      asmr: 'Five hundred cards... your mind is expanding beautifully...'
    }
  },

  // Exploration Achievements
  {
    id: 'voice_explorer',
    type: 'exploration',
    title: 'Voice Explorer',
    description: 'Try all voice personalities',
    icon: '🎭',
    requirement: { type: 'voice_personalities', value: 4 },
    celebrationMessage: {
      standard: 'Great! You\'ve explored all our voice personalities!',
      peterGriffin: 'Heh heh! You tried everyone! Even me! That\'s awesome!',
      motivational: 'FANTASTIC! You\'re maximizing your learning experience!',
      asmr: 'You\'ve experienced all our voices... how wonderfully curious...'
    }
  },
  {
    id: 'deck_master',
    type: 'mastery',
    title: 'Deck Master',
    description: 'Complete a full deck with 90% accuracy',
    icon: '💎',
    requirement: { type: 'deck_completion', value: 90 },
    celebrationMessage: {
      standard: 'Outstanding! You\'ve mastered this topic!',
      peterGriffin: 'Holy crap! 90%! You\'re like Rain Man but cooler!',
      motivational: 'EXCEPTIONAL! You\'ve achieved true mastery!',
      asmr: 'Ninety percent... such beautiful understanding...'
    }
  },

  // Special Achievements
  {
    id: 'peter_fan',
    type: 'special',
    title: 'Peter Griffin Superfan',
    description: 'Study 50 cards with Peter Griffin voice',
    icon: '🍺',
    requirement: { type: 'special_action', value: 50, additional: { voice: 'peter-griffin' } },
    celebrationMessage: {
      standard: 'You really love Peter Griffin\'s voice!',
      peterGriffin: 'Nyehehehe! You love me! That\'s freakin\' awesome! We\'re buddies now!',
      motivational: 'You found your perfect study voice! That\'s strategic!',
      asmr: 'You enjoy Peter\'s unique energy... each to their own path...'
    }
  },
  {
    id: 'night_owl',
    type: 'special',
    title: 'Night Owl',
    description: 'Study after 10 PM for 5 sessions',
    icon: '🦉',
    requirement: { type: 'special_action', value: 5, additional: { timeAfter: '22:00' } },
    celebrationMessage: {
      standard: 'Dedication! You study even late at night!',
      peterGriffin: 'Whoa! You study when everyone\'s sleeping! That\'s commitment!',
      motivational: 'DEDICATION! You make time when others make excuses!',
      asmr: 'Late night learning... so peaceful and focused...'
    }
  },
  {
    id: 'speed_demon',
    type: 'special',
    title: 'Speed Demon',
    description: 'Complete 20 cards in under 5 minutes',
    icon: '⚡',
    requirement: { type: 'special_action', value: 20, additional: { timeUnder: 300 } },
    celebrationMessage: {
      standard: 'Incredible speed! Your brain is firing fast!',
      peterGriffin: 'Holy schnikes! You\'re fast like the Road Runner!',
      motivational: 'LIGHTNING FAST! Your mind is sharp as a blade!',
      asmr: 'Such quick thinking... your mind flows like water...'
    }
  }
];

export function checkAchievements(
  userProfile: import('./profile').UserProfile,
  studySession?: import('./profile').StudySession
): Achievement[] {
  const newAchievements: Achievement[] = [];
  const existingIds = new Set(userProfile.achievements.map(a => a.id));

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (existingIds.has(def.id)) continue;

    let achieved = false;

    switch (def.requirement.type) {
      case 'streak_days':
        achieved = userProfile.currentStreak >= def.requirement.value;
        break;
      
      case 'cards_studied':
        achieved = userProfile.totalCardsStudied >= def.requirement.value;
        break;
      
      case 'voice_personalities':
        achieved = userProfile.featureDiscovery.hasChangedVoice && 
                  userProfile.studyHistory.length > 0; // Simplified for now
        break;
      
      case 'deck_completion':
        if (studySession) {
          const accuracy = (studySession.correctAnswers / studySession.cardsStudied) * 100;
          achieved = accuracy >= def.requirement.value && studySession.cardsStudied >= 5;
        }
        break;
      
      case 'special_action':
        // Handle special achievements based on additional criteria
        if (def.id === 'peter_fan') {
          const peterSessions = userProfile.studyHistory.filter(s => 
            s.voicePersonality === 'peter-griffin'
          );
          const peterCards = peterSessions.reduce((sum, s) => sum + s.cardsStudied, 0);
          achieved = peterCards >= def.requirement.value;
        }
        break;
    }

    if (achieved) {
      newAchievements.push({
        id: def.id,
        type: def.type,
        title: def.title,
        description: def.description,
        unlockedAt: new Date().toISOString(),
        celebrationShown: false,
        icon: def.icon
      });
    }
  }

  return newAchievements;
}

export function getCelebrationMessage(
  achievementId: string, 
  voicePersonality: import('./index').VoicePersonality
): string {
  const definition = ACHIEVEMENT_DEFINITIONS.find(d => d.id === achievementId);
  if (!definition) return 'Achievement unlocked!';
  
  const messages = definition.celebrationMessage as any;
  return messages[voicePersonality] || messages.standard;
}