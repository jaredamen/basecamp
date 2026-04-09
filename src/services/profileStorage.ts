import type { UserProfile, StudySession, Achievement } from '../types/profile';

const PROFILE_STORAGE_KEY = 'basecamp-user-profile';
const PROFILE_VERSION = '1.0.0';

interface StoredProfile extends UserProfile {
  version: string;
}

export class ProfileStorage {
  private static instance: ProfileStorage;
  
  static getInstance(): ProfileStorage {
    if (!ProfileStorage.instance) {
      ProfileStorage.instance = new ProfileStorage();
    }
    return ProfileStorage.instance;
  }

  createDefaultProfile(): UserProfile {
    const now = new Date().toISOString();
    
    return {
      createdAt: now,
      preferredVoice: 'standard',
      studySessionLength: 10,
      difficultyPreference: 'mixed',
      totalCardsStudied: 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      studyHistory: [],
      achievements: [],
      favoriteTopics: [],
      completedDecks: [],
      strugglingCards: [],
      hasCompletedOnboarding: false,
      onboardingStep: 0,
      totalSessionsCount: 0,
      totalStudyTimeMinutes: 0,
      lastActiveDate: now,
      featureDiscovery: {
        hasUsedTTS: false,
        hasChangedVoice: false,
        hasUsedAudioBriefings: false,
        hasImportedContent: false
      }
    };
  }

  loadProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) {
        return this.createDefaultProfile();
      }

      const parsed: StoredProfile = JSON.parse(stored);
      
      // Handle version migrations if needed
      if (parsed.version !== PROFILE_VERSION) {
        return this.migrateProfile(parsed);
      }

      // Remove version field for the runtime profile
      const { version, ...profile } = parsed;
      return profile;
    } catch (error) {
      console.error('Failed to load profile:', error);
      return this.createDefaultProfile();
    }
  }

  saveProfile(profile: UserProfile): void {
    try {
      const storedProfile: StoredProfile = {
        ...profile,
        version: PROFILE_VERSION,
        lastActiveDate: new Date().toISOString()
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(storedProfile));
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const currentProfile = this.loadProfile();
    const updatedProfile = { ...currentProfile, ...updates };
    this.saveProfile(updatedProfile);
    return updatedProfile;
  }

  addStudySession(session: StudySession): UserProfile {
    const profile = this.loadProfile();
    
    // Update session history
    profile.studyHistory.unshift(session);
    // Keep only last 100 sessions to prevent storage bloat
    if (profile.studyHistory.length > 100) {
      profile.studyHistory = profile.studyHistory.slice(0, 100);
    }

    // Update totals
    profile.totalCardsStudied += session.cardsStudied;
    profile.totalCorrectAnswers += session.correctAnswers;
    profile.totalIncorrectAnswers += session.incorrectAnswers;
    profile.totalSessionsCount += 1;
    profile.totalStudyTimeMinutes += session.durationMinutes;

    // Update streak
    const today = new Date().toDateString();
    const sessionDate = new Date(session.startTime).toDateString();
    const lastStudyDate = profile.lastStudyDate ? new Date(profile.lastStudyDate).toDateString() : null;

    if (sessionDate === today) {
      if (!lastStudyDate || lastStudyDate !== today) {
        // First session today
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (lastStudyDate === yesterdayString) {
          profile.currentStreak += 1;
        } else if (!lastStudyDate || lastStudyDate !== today) {
          profile.currentStreak = 1;
        }
        
        profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
        profile.lastStudyDate = session.startTime;
      }
    }

    // Update feature discovery
    if (session.voicePersonality !== 'standard') {
      profile.featureDiscovery.hasChangedVoice = true;
    }
    profile.featureDiscovery.hasUsedTTS = true;

    this.saveProfile(profile);
    return profile;
  }

  addAchievements(achievements: Achievement[]): UserProfile {
    const profile = this.loadProfile();
    profile.achievements.push(...achievements);
    this.saveProfile(profile);
    return profile;
  }

  markAchievementCelebrationShown(achievementId: string): void {
    const profile = this.loadProfile();
    const achievement = profile.achievements.find(a => a.id === achievementId);
    if (achievement) {
      achievement.celebrationShown = true;
      this.saveProfile(profile);
    }
  }

  updateOnboardingProgress(step: number): UserProfile {
    const profile = this.loadProfile();
    profile.onboardingStep = Math.max(profile.onboardingStep, step);
    this.saveProfile(profile);
    return profile;
  }

  completeOnboarding(): UserProfile {
    const profile = this.loadProfile();
    profile.hasCompletedOnboarding = true;
    this.saveProfile(profile);
    return profile;
  }

  updateFeatureDiscovery(feature: keyof UserProfile['featureDiscovery']): UserProfile {
    const profile = this.loadProfile();
    profile.featureDiscovery[feature] = true;
    this.saveProfile(profile);
    return profile;
  }

  getStudyStats(days: number = 7): {
    sessionsCount: number;
    cardsStudied: number;
    averageAccuracy: number;
    totalMinutes: number;
    streakActive: boolean;
  } {
    const profile = this.loadProfile();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSessions = profile.studyHistory.filter(session => 
      new Date(session.startTime) >= cutoffDate
    );

    const totalCards = recentSessions.reduce((sum, s) => sum + s.cardsStudied, 0);
    const totalCorrect = recentSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const totalMinutes = recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const averageAccuracy = totalCards > 0 ? (totalCorrect / totalCards) * 100 : 0;

    // Check if streak is still active (studied today or yesterday)
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    const lastStudyDate = profile.lastStudyDate ? new Date(profile.lastStudyDate).toDateString() : null;
    const streakActive = lastStudyDate === today || lastStudyDate === yesterdayString;

    return {
      sessionsCount: recentSessions.length,
      cardsStudied: totalCards,
      averageAccuracy: Math.round(averageAccuracy),
      totalMinutes,
      streakActive: streakActive && profile.currentStreak > 0
    };
  }

  exportProfile(): string {
    const profile = this.loadProfile();
    return JSON.stringify(profile, null, 2);
  }

  importProfile(profileData: string): UserProfile {
    try {
      const imported = JSON.parse(profileData);
      // Validate basic structure
      if (imported && typeof imported === 'object' && imported.createdAt) {
        this.saveProfile(imported);
        return imported;
      } else {
        throw new Error('Invalid profile format');
      }
    } catch (error) {
      console.error('Failed to import profile:', error);
      throw new Error('Failed to import profile data');
    }
  }

  clearProfile(): UserProfile {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    return this.createDefaultProfile();
  }

  private migrateProfile(oldProfile: StoredProfile): UserProfile {
    // Handle profile migrations between versions
    console.log(`Migrating profile from ${oldProfile.version} to ${PROFILE_VERSION}`);
    
    // For now, just create a new profile with some preserved data
    const newProfile = this.createDefaultProfile();
    
    // Preserve important data if it exists
    if (oldProfile.displayName) newProfile.displayName = oldProfile.displayName;
    if (oldProfile.preferredVoice) newProfile.preferredVoice = oldProfile.preferredVoice;
    if (oldProfile.totalCardsStudied) newProfile.totalCardsStudied = oldProfile.totalCardsStudied;
    if (oldProfile.currentStreak) newProfile.currentStreak = oldProfile.currentStreak;
    if (oldProfile.longestStreak) newProfile.longestStreak = oldProfile.longestStreak;
    
    this.saveProfile(newProfile);
    return newProfile;
  }
}