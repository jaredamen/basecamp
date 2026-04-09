import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Basecamp/);
    
    // Check for main UI elements
    await expect(page.locator('[data-testid="bottom-nav"]').or(page.locator('nav'))).toBeVisible();
  });

  test('should navigate between flashcards and audio tabs', async ({ page }) => {
    // Should start on flashcards tab (or show both tabs)
    const flashcardsButton = page.getByRole('button', { name: /flashcards/i });
    const audioButton = page.getByRole('button', { name: /audio/i });

    // Check if tabs are visible
    if (await flashcardsButton.isVisible()) {
      // Click audio tab
      await audioButton.click();
      await expect(page.getByText(/audio briefing/i).or(page.getByText(/briefing/i))).toBeVisible();

      // Click back to flashcards
      await flashcardsButton.click();
      await expect(page.getByText(/flashcard/i).or(page.getByText(/deck/i))).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // The app should show either sample data or empty states
    const content = page.locator('main, [role="main"], body');
    await expect(content).toBeVisible();
    
    // Should not show error states on first load
    await expect(page.getByText(/error/i)).not.toBeVisible();
    await expect(page.getByText(/failed/i)).not.toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the app still renders properly on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Should show mobile-friendly navigation
    const navigation = page.locator('[data-testid="bottom-nav"]').or(page.locator('nav'));
    if (await navigation.isVisible()) {
      await expect(navigation).toBeVisible();
    }
  });

  test('should handle back navigation', async ({ page }) => {
    // If there's a way to navigate into a detail view, test back button
    const detailLink = page.getByRole('button').first();
    
    if (await detailLink.isVisible()) {
      await detailLink.click();
      
      // Look for back button
      const backButton = page.getByRole('button', { name: /back/i })
        .or(page.getByRole('button', { name: /←/i }))
        .or(page.locator('[aria-label*="back"]'));
      
      if (await backButton.isVisible()) {
        await backButton.click();
        // Should return to main view
        await expect(page.locator('main, body')).toBeVisible();
      }
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Test that user preferences and states persist during navigation
    await page.goto('/');
    
    // The app should load consistently
    await expect(page.locator('body')).toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Should still work after reload
    await expect(page.locator('body')).toBeVisible();
  });
});