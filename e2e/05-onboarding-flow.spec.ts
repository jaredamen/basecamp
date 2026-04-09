import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show welcome screen for new users', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show welcome screen
    await expect(page.getByText(/Basecamp/i)).toBeVisible();
    await expect(page.getByText(/AI Learning Companion/i)).toBeVisible();
    
    // Should show value proposition
    await expect(page.getByText(/Turn any topic into fun, bite-sized learning/i)).toBeVisible();
    
    // Should show feature highlights
    await expect(page.getByText(/Smart Flashcards/i)).toBeVisible();
    await expect(page.getByText(/Fun Voices/i)).toBeVisible();
    await expect(page.getByText(/Study Anywhere/i)).toBeVisible();
    
    // Should show CTA buttons
    await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /See Demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Skip to App/i })).toBeVisible();
  });

  test('should complete full onboarding flow', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Step 1: Welcome screen - click Get Started
    await page.getByRole('button', { name: /Get Started/i }).click();

    // Step 2: Profile setup - Name entry
    await expect(page.getByText(/What should we call you/i)).toBeVisible();
    
    const nameInput = page.locator('input[placeholder*="name"]');
    await nameInput.fill('Test User');
    
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3: Voice selection
    await expect(page.getByText(/Choose Your Study Voice/i)).toBeVisible();
    
    // Should show voice options
    await expect(page.getByText(/Standard/i)).toBeVisible();
    await expect(page.getByText(/Peter Griffin/i)).toBeVisible();
    await expect(page.getByText(/Motivational/i)).toBeVisible();
    await expect(page.getByText(/ASMR/i)).toBeVisible();
    
    // Select Peter Griffin
    await page.getByRole('button').filter({ hasText: /Peter Griffin/i }).click();
    
    // Test voice sample
    const voiceSampleButton = page.locator('button').filter({ hasText: /▶️/i }).first();
    if (await voiceSampleButton.isVisible()) {
      await voiceSampleButton.click();
      await page.waitForTimeout(500); // Brief wait for audio
    }
    
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 4: Study preferences
    await expect(page.getByText(/Study Preferences/i)).toBeVisible();
    
    // Select 10 minute sessions
    await page.getByRole('button').filter({ hasText: /10 minutes/i }).click();
    
    // Select mixed difficulty
    await page.getByRole('button').filter({ hasText: /Mixed/i }).click();
    
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 5: Time preferences
    await expect(page.getByText(/When do you learn best/i)).toBeVisible();
    
    // Select morning preference
    await page.getByRole('button').filter({ hasText: /Morning Person/i }).click();
    
    // Complete setup
    await page.getByRole('button', { name: /Complete Setup/i }).click();

    // Should reach dashboard
    await expect(page.getByText(/Hey Test User/i)).toBeVisible();
    await expect(page.getByText(/Start Today's Session/i)).toBeVisible();
  });

  test('should allow demo flow before signup', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click See Demo
    await page.getByRole('button', { name: /See Demo/i }).click();

    // Should start demo flow
    await expect(page.getByText(/Smart Flashcards/i)).toBeVisible();
    
    // Should show demo flashcard
    await expect(page.getByText(/What makes Kubernetes pods special/i)).toBeVisible();
    
    // Test "Read Aloud" button
    const readAloudButton = page.getByRole('button', { name: /Read Aloud/i });
    if (await readAloudButton.isVisible()) {
      await readAloudButton.click();
      // Should show reading state
      await expect(page.getByText(/Reading/i)).toBeVisible();
    }
    
    // Test show answer
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await expect(page.getByText(/Pods are the smallest deployable units/i)).toBeVisible();
    
    // Continue to voice demo
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Should show voice personalities
    await expect(page.getByText(/Choose Your Voice Personality/i)).toBeVisible();
    
    // Test Peter Griffin voice
    await page.getByRole('button').filter({ hasText: /Peter Griffin/i }).click();
    
    // Continue to features
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Should show feature overview
    await expect(page.getByText(/Powerful Learning Features/i)).toBeVisible();
    await expect(page.getByText(/Progress Tracking/i)).toBeVisible();
    await expect(page.getByText(/Achievement System/i)).toBeVisible();
    
    // Complete demo
    await page.getByRole('button', { name: /Start Learning/i }).click();
    
    // Should go to profile setup
    await expect(page.getByText(/What should we call you/i)).toBeVisible();
  });

  test('should allow skipping to app', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click Skip to App
    await page.getByRole('button', { name: /Skip to App/i }).click();

    // Should skip to dashboard with default profile
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByText(/Start Today's Session/i)).toBeVisible();
    
    // Should show default progress (0 streak, 0 cards)
    await expect(page.getByText(/0/)).toBeVisible();
  });

  test('should persist onboarding progress', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Start onboarding
    await page.getByRole('button', { name: /Get Started/i }).click();
    
    // Enter name
    await page.locator('input[placeholder*="name"]').fill('Persistent User');
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Refresh page mid-onboarding
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should resume from voice selection step
    await expect(page.getByText(/Choose Your Study Voice/i)).toBeVisible();
    
    // Complete onboarding
    await page.getByRole('button').filter({ hasText: /Standard/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Skip remaining steps quickly
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Complete Setup/i }).click();
    
    // Should reach dashboard
    await expect(page.getByText(/Hey Persistent User/i)).toBeVisible();
    
    // Refresh again - should stay on dashboard
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on dashboard, not onboarding
    await expect(page.getByText(/Hey Persistent User/i)).toBeVisible();
  });

  test('should handle voice settings accessibility', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Navigate to voice selection step
    await page.getByRole('button', { name: /Get Started/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click(); // Skip name
    
    // Test keyboard navigation through voice options
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to select with keyboard
    const firstVoiceOption = page.getByRole('button').filter({ hasText: /Standard/i });
    await firstVoiceOption.focus();
    await page.keyboard.press('Enter');
    
    // Should be selected
    await expect(firstVoiceOption).toHaveClass(/border-blue-500/);
    
    // Test voice sample with keyboard
    await page.keyboard.press('Tab'); // Move to play button
    await page.keyboard.press('Enter');
    
    // Continue with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Continue button
    
    // Should advance to next step
    await expect(page.getByText(/Study Preferences/i)).toBeVisible();
  });

  test('should show appropriate error states', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test with invalid name (too long)
    await page.getByRole('button', { name: /Get Started/i }).click();
    
    const nameInput = page.locator('input[placeholder*="name"]');
    await nameInput.fill('A'.repeat(50)); // Very long name
    
    // Should handle gracefully - truncate or show warning
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Should still advance (graceful handling)
    await expect(page.getByText(/Choose Your Study Voice/i)).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Welcome screen should be responsive
    await expect(page.getByText(/Basecamp/i)).toBeVisible();
    
    // CTA buttons should be accessible
    const getStartedBtn = page.getByRole('button', { name: /Get Started/i });
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();
    
    // Profile setup should work on mobile
    await expect(page.getByText(/What should we call you/i)).toBeVisible();
    
    // Input should be appropriately sized
    const nameInput = page.locator('input[placeholder*="name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Mobile User');
    
    // Continue button should be accessible
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Voice selection should work on mobile
    await expect(page.getByText(/Choose Your Study Voice/i)).toBeVisible();
    
    // Voice options should be properly sized
    const voiceButton = page.getByRole('button').filter({ hasText: /Peter Griffin/i });
    await expect(voiceButton).toBeVisible();
    await voiceButton.click();
    
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Preferences should work on mobile
    await expect(page.getByText(/Study Preferences/i)).toBeVisible();
    
    // Grid layout should be responsive
    await page.getByRole('button').filter({ hasText: /5 minutes/i }).click();
    await page.getByRole('button').filter({ hasText: /Easy Start/i }).click();
    
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button').filter({ hasText: /Afternoon/i }).click();
    await page.getByRole('button', { name: /Complete Setup/i }).click();
    
    // Dashboard should be mobile-friendly
    await expect(page.getByText(/Hey Mobile User/i)).toBeVisible();
    await expect(page.getByText(/Start Today's Session/i)).toBeVisible();
  });

  test('should handle profile preference updates', async ({ page }) => {
    // Complete onboarding first
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    await page.getByRole('button', { name: /Get Started/i }).click();
    
    // Quick onboarding
    await page.locator('input[placeholder*="name"]').fill('Preference User');
    await page.getByRole('button', { name: /Continue/i }).click();
    
    await page.getByRole('button').filter({ hasText: /Peter Griffin/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    
    await page.getByRole('button').filter({ hasText: /15 minutes/i }).click();
    await page.getByRole('button').filter({ hasText: /Challenge Me/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    
    await page.getByRole('button').filter({ hasText: /Evening/i }).click();
    await page.getByRole('button', { name: /Complete Setup/i }).click();
    
    // Should reach dashboard with preferences applied
    await expect(page.getByText(/Hey Preference User/i)).toBeVisible();
    
    // Preferences should be persisted across reloads
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText(/Hey Preference User/i)).toBeVisible();
  });
});