import { useState, useEffect, useCallback } from 'react';
import type { UserProfile, StudySession, Achievement } from '../types/profile';
import type { VoicePersonality } from '../types';
import { ProfileStorage } from '../services/profileStorage';
import { checkAchievements } from '../types/achievements';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  const profileStorage = ProfileStorage.getInstance();

  useEffect(() => {
    const loadProfile = () => {
      try {
        const loadedProfile = profileStorage.loadProfile();
        setProfile(loadedProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfile(profileStorage.createDefaultProfile());
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    if (!profile) return;
    
    const updatedProfile = profileStorage.updateProfile(updates);
    setProfile(updatedProfile);
  }, [profile]);

  const updateDisplayName = useCallback((name: string) => {
    updateProfile({ displayName: name });
  }, [updateProfile]);

  const updateVoicePreference = useCallback((voice: VoicePersonality) => {
    updateProfile({ preferredVoice: voice });
    
    // Mark feature discovery if not standard voice
    if (voice !== 'standard') {
      profileStorage.updateFeatureDiscovery('hasChangedVoice');
    }
  }, [updateProfile]);

  const updateStudyPreferences = useCallback((preferences: {
    studySessionLength?: number;
    difficultyPreference?: UserProfile['difficultyPreference'];
    studyTimePreference?: UserProfile['studyTimePreference'];
  }) => {
    updateProfile(preferences);
  }, [updateProfile]);

  const recordStudySession = useCallback((session: Omit<StudySession, 'id'>) => {
    if (!profile) return;

    const fullSession: StudySession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Update profile with session data
    const updatedProfile = profileStorage.addStudySession(fullSession);
    setProfile(updatedProfile);

    // Check for new achievements
    const achievements = checkAchievements(updatedProfile, fullSession);
    if (achievements.length > 0) {
      const finalProfile = profileStorage.addAchievements(achievements);
      setProfile(finalProfile);
      setNewAchievements(prev => [...prev, ...achievements]);
    }
  }, [profile]);

  const updateOnboardingProgress = useCallback((step: number) => {
    const updatedProfile = profileStorage.updateOnboardingProgress(step);
    setProfile(updatedProfile);
  }, []);

  const completeOnboarding = useCallback(() => {
    const updatedProfile = profileStorage.completeOnboarding();
    setProfile(updatedProfile);
  }, []);

  const markFeatureDiscovery = useCallback((feature: keyof UserProfile['featureDiscovery']) => {
    const updatedProfile = profileStorage.updateFeatureDiscovery(feature);
    setProfile(updatedProfile);
  }, []);

  const dismissAchievement = useCallback((achievementId: string) => {
    profileStorage.markAchievementCelebrationShown(achievementId);
    setNewAchievements(prev => prev.filter(a => a.id !== achievementId));
  }, []);

  const getStudyStats = useCallback((days: number = 7) => {
    return profileStorage.getStudyStats(days);
  }, []);

  const resetProfile = useCallback(() => {
    const newProfile = profileStorage.clearProfile();
    setProfile(newProfile);
    setNewAchievements([]);
  }, []);

  // Helper functions for components
  const getPersonalizedGreeting = useCallback(() => {
    if (!profile) return 'Welcome!';
    
    const name = profile.displayName || 'there';
    const hour = new Date().getHours();
    
    let timeGreeting = 'Hello';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const voicePersonality = profile.preferredVoice;
    
    switch (voicePersonality) {
      case 'peter-griffin':
        return `Hey ${name}! Ready to learn some freakin' awesome stuff?`;
      case 'motivational':
        return `${timeGreeting} ${name}! TIME TO CRUSH SOME LEARNING GOALS!`;
      case 'asmr':
        return `${timeGreeting} ${name}... ready for a peaceful study session?`;
      default:
        return `${timeGreeting}, ${name}! Ready to study?`;
    }
  }, [profile]);

  const getStudyRecommendation = useCallback(() => {
    if (!profile) return null;

    const stats = getStudyStats(7);
    const now = new Date();
    const preferredTime = profile.studyTimePreference;
    const sessionLength = profile.studySessionLength;

    // Time-based recommendations
    if (preferredTime) {
      const currentHour = now.getHours();
      let inPreferredTime = false;
      
      switch (preferredTime) {
        case 'morning':
          inPreferredTime = currentHour >= 6 && currentHour < 12;
          break;
        case 'afternoon':
          inPreferredTime = currentHour >= 12 && currentHour < 17;
          break;
        case 'evening':
          inPreferredTime = currentHour >= 17 && currentHour < 22;
          break;
      }
      
      if (inPreferredTime && stats.sessionsCount === 0) {
        return {
          type: 'time_based' as const,
          message: `Perfect time for your ${sessionLength}-minute study session!`,
          actionText: `Start ${sessionLength}min session`,
          priority: 'high' as const
        };
      }
    }

    // Streak-based recommendations
    if (!stats.streakActive && profile.currentStreak > 0) {
      return {
        type: 'streak_recovery' as const,
        message: `Don't break your ${profile.currentStreak}-day streak! Quick session?`,
        actionText: 'Continue streak',
        priority: 'urgent' as const
      };
    }

    // Achievement-based recommendations
    const cardsToNextMilestone = [50, 100, 200, 500, 1000].find(m => m > profile.totalCardsStudied);
    if (cardsToNextMilestone) {
      const remaining = cardsToNextMilestone - profile.totalCardsStudied;
      if (remaining <= 10) {
        return {
          type: 'achievement_close' as const,
          message: `Just ${remaining} more cards to reach ${cardsToNextMilestone} cards!`,
          actionText: 'Finish milestone',
          priority: 'medium' as const
        };
      }
    }

    return null;
  }, [profile, getStudyStats]);

  return {
    profile,
    loading,
    newAchievements,
    
    // Profile updates
    updateProfile,
    updateDisplayName,
    updateVoicePreference,
    updateStudyPreferences,
    
    // Study tracking
    recordStudySession,
    getStudyStats,
    
    // Onboarding
    updateOnboardingProgress,
    completeOnboarding,
    markFeatureDiscovery,
    
    // Achievements
    dismissAchievement,
    
    // Utilities
    getPersonalizedGreeting,
    getStudyRecommendation,
    resetProfile
  };
}