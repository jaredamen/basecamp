export interface StudySession {
  id: string;
  deckId: string;
  startTime: string;
  endTime: string;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  durationMinutes: number;
  voicePersonality: string;
}

export interface Achievement {
  id: string;
  type: 'streak' | 'mastery' | 'exploration' | 'special';
  title: string;
  description: string;
  unlockedAt: string;
  celebrationShown: boolean;
  icon: string;
}

export type StudyDifficulty = 'easy' | 'mixed' | 'challenging';
export type StudyTimePreference = 'morning' | 'afternoon' | 'evening' | 'flexible';

export interface UserProfile {
  // Identity (optional)
  displayName?: string;
  avatar?: string;
  createdAt: string;
  
  // Preferences
  preferredVoice: import('./index').VoicePersonality;
  studySessionLength: number; // minutes: 5, 10, 15, 30
  difficultyPreference: StudyDifficulty;
  studyTimePreference?: StudyTimePreference;
  
  // Progress & History
  totalCardsStudied: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  studyHistory: StudySession[];
  achievements: Achievement[];
  
  // Learning Patterns
  favoriteTopics: string[];
  completedDecks: string[];
  strugglingCards: string[]; // Card IDs that user frequently gets wrong
  
  // Onboarding State
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  lastSeenFeature?: string;
  
  // App Usage
  totalSessionsCount: number;
  totalStudyTimeMinutes: number;
  lastActiveDate: string;
  featureDiscovery: {
    hasUsedTTS: boolean;
    hasChangedVoice: boolean;
    hasUsedAudioBriefings: boolean;
    hasImportedContent: boolean;
  };
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  skippedDemo: boolean;
  profileSetupComplete: boolean;
}

export interface StudyGoal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number; // cards to study
  current: number;
  startDate: string;
  endDate: string;
  achieved: boolean;
}

export interface LearningInsight {
  id: string;
  type: 'pattern' | 'achievement' | 'suggestion' | 'celebration';
  title: string;
  message: string;
  actionable?: boolean;
  action?: string;
  relevantDate: string;
  shown: boolean;
}