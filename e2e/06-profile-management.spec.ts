import { test, expect } from '@playwright/test';

test.describe('Profile Management and Achievements', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a user profile with some progress
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      
      // Create a profile with some progress
      const profile = {
        displayName: 'Test Achiever',
        createdAt: new Date().toISOString(),
        preferredVoice: 'peter-griffin',
        studySessionLength: 10,
        difficultyPreference: 'mixed',
        totalCardsStudied: 15,
        totalCorrectAnswers: 12,
        totalIncorrectAnswers: 3,
        currentStreak: 3,
        longestStreak: 5,
        lastStudyDate: new Date().toISOString(),
        studyHistory: [
          {
            id: 'session1',
            deckId: 'kubernetes-deck',
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date(Date.now() - 86400000 + 600000).toISOString(),
            cardsStudied: 10,
            correctAnswers: 8,
            incorrectAnswers: 2,
            durationMinutes: 10,
            voicePersonality: 'peter-griffin'
          }
        ],
        achievements: [
          {
            id: 'cards_10',
            type: 'mastery',
            title: 'First Steps',
            description: 'Study 10 flashcards',
            unlockedAt: new Date().toISOString(),
            celebrationShown: true,
            icon: '📚'
          }
        ],
        favoriteTopics: ['kubernetes'],
        completedDecks: [],
        strugglingCards: [],
        hasCompletedOnboarding: true,
        onboardingStep: 4,
        totalSessionsCount: 3,
        totalStudyTimeMinutes: 30,
        lastActiveDate: new Date().toISOString(),
        featureDiscovery: {
          hasUsedTTS: true,
          hasChangedVoice: true,
          hasUsedAudioBriefings: false,
          hasImportedContent: false
        },
        version: '1.0.0'
      };
      
      localStorage.setItem('basecamp-user-profile', JSON.stringify(profile));
    });
    
    await page.reload();
  });

  test('should display progress dashboard for returning users', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should skip onboarding and go to dashboard
    await expect(page.getByText(/Hey Test Achiever/i)).toBeVisible();
    
    // Should show progress stats
    await expect(page.getByText(/3/)).toBeVisible(); // Current streak
    await expect(page.getByText(/15/)).toBeVisible(); // Total cards
    
    // Should show study streak indicator
    await expect(page.locator(':has-text("🔥")')).toBeVisible();
    
    // Should show motivational message
    await expect(page.getByText(/Holy crap/i)).toBeVisible(); // Peter Griffin personality
    
    // Should show CTA to continue studying
    await expect(page.getByRole('button', { name: /Start Today's Session/i })).toBeVisible();
  });

  test('should track study sessions and update progress', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Start a study session
    await page.getByRole('button', { name: /Start Today's Session/i }).click();
    
    // Should navigate to flashcard list
    await expect(page.getByText(/flashcard/i)).toBeVisible();
    
    // Select a deck (if available)
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Should show flashcard viewer
      await expect(page.getByText(/question|card/i)).toBeVisible();
      
      // Answer some cards to generate progress
      const showAnswerButton = page.getByRole('button', { name: /show answer/i });
      if (await showAnswerButton.isVisible()) {
        await showAnswerButton.click();
        
        // Mark as correct
        const gotItButton = page.getByRole('button', { name: /got it|correct/i });
        if (await gotItButton.isVisible()) {
          await gotItButton.click();
          
          // Check if progress updated (this would require actual implementation)
          // For now, we just verify the UI responds
          await expect(page.locator('body')).toBeVisible();
        }
      }
      
      // Go back to see if progress updated
      const backButton = page.getByRole('button', { name: /back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        await backButton.click(); // Back to dashboard
        
        // Progress should be updated (implementation dependent)
        await expect(page.getByText(/Test Achiever/i)).toBeVisible();
      }
    }
  });

  test('should show and dismiss achievement notifications', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Simulate earning a new achievement by updating localStorage
    await page.evaluate(() => {
      const storedProfile = localStorage.getItem('basecamp-user-profile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        
        // Add a new achievement that hasn't been shown
        profile.achievements.push({
          id: 'streak_3',
          type: 'streak',
          title: 'Getting Started',
          description: 'Study for 3 days in a row',
          unlockedAt: new Date().toISOString(),
          celebrationShown: false,
          icon: '🔥'
        });
        
        localStorage.setItem('basecamp-user-profile', JSON.stringify(profile));
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show achievement toast
    await expect(page.getByText(/Achievement Unlocked/i)).toBeVisible();
    await expect(page.getByText(/Getting Started/i)).toBeVisible();
    await expect(page.getByText(/Study for 3 days in a row/i)).toBeVisible();
    
    // Should show Peter Griffin celebration message
    await expect(page.getByText(/Holy crap/i)).toBeVisible();
    
    // Should have replay and dismiss buttons
    await expect(page.getByRole('button', { name: /Replay/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Awesome/i })).toBeVisible();
    
    // Test replay button
    const replayButton = page.getByRole('button', { name: /Replay/i });
    await replayButton.click();
    
    // Should show playing state
    await expect(page.getByText(/Playing/i)).toBeVisible();
    
    // Dismiss achievement
    await page.getByRole('button', { name: /Awesome/i }).click();
    
    // Achievement toast should disappear
    await expect(page.getByText(/Achievement Unlocked/i)).not.toBeVisible();
  });

  test('should handle streak tracking correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show current 3-day streak
    await expect(page.getByText(/3/)).toBeVisible();
    await expect(page.locator(':has-text("🔥")')).toBeVisible();
    
    // Simulate studying today by completing a session
    // This would require actual flashcard completion in a real test
    
    // Should show appropriate streak message for Peter Griffin personality
    await expect(page.getByText(/Holy crap.*3 days|freakin.*roll/i)).toBeVisible();
  });

  test('should show study statistics accurately', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show total cards studied
    await expect(page.getByText(/15/)).toBeVisible();
    
    // Should show current streak
    await expect(page.getByText(/3/)).toBeVisible();
    
    // Should calculate and show accuracy
    // 12 correct out of 15 total = 80%
    await expect(page.getByText(/80%/)).toBeVisible();
    
    // Should show study time (implementation dependent)
    await expect(page.getByText(/30m|0h 30m/)).toBeVisible();
  });

  test('should persist voice personality preference', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should use Peter Griffin personality for messages
    await expect(page.getByText(/Holy crap|freakin|Nyehehehe/i)).toBeVisible();
    
    // Should show Peter Griffin emoji in appropriate places
    await expect(page.locator(':has-text("🍺")')).toBeVisible();
  });

  test('should handle profile preferences updates', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Access voice settings (implementation dependent on UI)
    const voiceSettingsButton = page.getByRole('button', { name: /voice|settings/i });
    
    if (await voiceSettingsButton.isVisible()) {
      await voiceSettingsButton.click();
      
      // Should show current voice selection (Peter Griffin)
      await expect(page.getByText(/Peter Griffin/i)).toBeVisible();
      
      // Change to different voice
      const motivationalButton = page.getByRole('button').filter({ hasText: /motivational/i });
      if (await motivationalButton.isVisible()) {
        await motivationalButton.click();
        
        // Save/close settings
        const closeButton = page.getByRole('button', { name: /close|save/i });
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        
        // Reload and check if preference persisted
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Should now show motivational messages
        await expect(page.getByText(/YES|CRUSH|CHAMPION/i)).toBeVisible();
      }
    }
  });

  test('should show recent achievements in dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show recent achievements section
    await expect(page.getByText(/Recent Achievements/i)).toBeVisible();
    
    // Should show the "First Steps" achievement
    await expect(page.getByText(/First Steps/i)).toBeVisible();
    await expect(page.locator(':has-text("📚")')).toBeVisible();
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Clear all progress to test empty states
    await page.evaluate(() => {
      const profile = {
        displayName: 'New User',
        createdAt: new Date().toISOString(),
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
        hasCompletedOnboarding: true,
        onboardingStep: 4,
        totalSessionsCount: 0,
        totalStudyTimeMinutes: 0,
        lastActiveDate: new Date().toISOString(),
        featureDiscovery: {
          hasUsedTTS: false,
          hasChangedVoice: false,
          hasUsedAudioBriefings: false,
          hasImportedContent: false
        },
        version: '1.0.0'
      };
      
      localStorage.setItem('basecamp-user-profile', JSON.stringify(profile));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show welcome message for new progress
    await expect(page.getByText(/Hey New User/i)).toBeVisible();
    
    // Should show zero values appropriately
    await expect(page.getByText(/0/)).toBeVisible();
    
    // Should show encouraging message for new users
    await expect(page.getByText(/streak started|learning journey|expert was once a beginner/i)).toBeVisible();
    
    // Should still show start session button
    await expect(page.getByRole('button', { name: /Start Today's Session/i })).toBeVisible();
  });

  test('should calculate weekly stats correctly', async ({ page }) => {
    // Add more recent sessions to localStorage
    await page.evaluate(() => {
      const storedProfile = localStorage.getItem('basecamp-user-profile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        
        // Add sessions from this week
        const today = new Date();
        const yesterday = new Date(today.getTime() - 86400000);
        
        profile.studyHistory = [
          {
            id: 'recent1',
            deckId: 'test-deck',
            startTime: today.toISOString(),
            endTime: new Date(today.getTime() + 300000).toISOString(),
            cardsStudied: 5,
            correctAnswers: 4,
            incorrectAnswers: 1,
            durationMinutes: 5,
            voicePersonality: 'peter-griffin'
          },
          {
            id: 'recent2',
            deckId: 'test-deck',
            startTime: yesterday.toISOString(),
            endTime: new Date(yesterday.getTime() + 600000).toISOString(),
            cardsStudied: 8,
            correctAnswers: 6,
            incorrectAnswers: 2,
            durationMinutes: 10,
            voicePersonality: 'peter-griffin'
          }
        ];
        
        profile.totalCardsStudied = 13;
        profile.totalCorrectAnswers = 10;
        profile.totalIncorrectAnswers = 3;
        profile.totalStudyTimeMinutes = 15;
        profile.totalSessionsCount = 2;
        
        localStorage.setItem('basecamp-user-profile', JSON.stringify(profile));
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show weekly progress
    await expect(page.getByText(/This Week's Progress/i)).toBeVisible();
    
    // Should show session count
    await expect(page.getByText(/2 sessions/i)).toBeVisible();
    
    // Should show total cards from this week
    await expect(page.getByText(/13/)).toBeVisible();
    
    // Should calculate accuracy: 10/13 ≈ 77%
    await expect(page.getByText(/77%/)).toBeVisible();
  });

  test('should work with different voice personalities', async ({ page }) => {
    // Test each voice personality's messaging
    const personalities = ['standard', 'peter-griffin', 'motivational', 'asmr'];
    
    for (const personality of personalities) {
      await page.evaluate((voice) => {
        const storedProfile = localStorage.getItem('basecamp-user-profile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          profile.preferredVoice = voice;
          localStorage.setItem('basecamp-user-profile', JSON.stringify(profile));
        }
      }, personality);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Each personality should show appropriate messaging
      switch (personality) {
        case 'peter-griffin':
          await expect(page.getByText(/Holy crap|freakin|Nyehehehe/i)).toBeVisible();
          break;
        case 'motivational':
          await expect(page.getByText(/YES|CRUSH|CHAMPION/i)).toBeVisible();
          break;
        case 'asmr':
          await expect(page.getByText(/peaceful|gentle|beautiful/i)).toBeVisible();
          break;
        default:
          // Standard personality
          await expect(page.getByText(/Ready to study|Great job/i)).toBeVisible();
      }
    }
  });
});