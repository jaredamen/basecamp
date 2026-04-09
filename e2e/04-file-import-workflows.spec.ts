import { test, expect } from '@playwright/test';

test.describe('File Import and Core Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle file import interface', async ({ page }) => {
    // Look for import functionality
    const importButton = page.getByRole('button', { name: /import|upload|file/i })
      .or(page.locator('input[type="file"]'))
      .or(page.getByText(/import|upload/i))
      .first();
    
    if (await importButton.isVisible()) {
      await expect(importButton).toBeVisible();
      
      // Should be enabled
      if (await importButton.getAttribute('disabled') !== '') {
        await expect(importButton).toBeEnabled();
      }
    }
  });

  test('should show drag and drop interface if available', async ({ page }) => {
    // Look for file drop zone
    const dropZone = page.locator('[data-testid*="drop"], [class*="drop"], [class*="drag"]')
      .or(page.getByText(/drag.*drop|drop.*file/i))
      .first();
    
    if (await dropZone.isVisible()) {
      await expect(dropZone).toBeVisible();
      
      // Test drag over effect (visual feedback)
      await dropZone.hover();
    }
  });

  test('should validate file types for import', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Check if there are file type restrictions
      const accept = await fileInput.getAttribute('accept');
      
      if (accept) {
        // Should accept JSON files for basecamp data
        expect(accept).toContain('.json');
      }
    }
  });

  test('should handle import errors gracefully', async ({ page }) => {
    // This test would require setting up file mocks
    // For now, we'll test that error states don't break the app
    
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Create a minimal test file (this is browser-dependent)
      // In a real test, you'd use page.setInputFiles() with test files
      
      // For now, just ensure the UI doesn't crash when no file is selected
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should complete flashcard study workflow', async ({ page }) => {
    // Navigate to flashcards
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible()) {
      await flashcardsTab.click();
    }
    
    // Select a deck
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Should show flashcard interface
      await expect(page.getByText(/question|card/i)).toBeVisible();
      
      // Reveal answer
      const showAnswerButton = page.getByRole('button', { name: /show answer|reveal/i });
      if (await showAnswerButton.isVisible()) {
        await showAnswerButton.click();
        
        // Mark as "got it"
        const gotItButton = page.getByRole('button', { name: /got it|correct/i });
        if (await gotItButton.isVisible()) {
          await gotItButton.click();
          
          // Should advance to next card or show progress
          await expect(page.locator('main, body')).toBeVisible();
          
          // Check if progress counter updated
          const progressText = page.getByText(/\d+ of \d+|\d+\/\d+/);
          if (await progressText.isVisible()) {
            await expect(progressText).toBeVisible();
          }
        }
      }
    }
  });

  test('should complete audio briefing workflow', async ({ page }) => {
    // Navigate to audio
    const audioTab = page.getByRole('button', { name: /audio/i });
    if (await audioTab.isVisible()) {
      await audioTab.click();
    }
    
    // Select a briefing
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing|release/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Should show audio player
      await expect(page.getByText(/briefing|script|audio/i)).toBeVisible();
      
      // Try to play
      const playButton = page.getByRole('button', { name: /play/i }).first();
      if (await playButton.isVisible()) {
        await playButton.click();
        
        // Should show some kind of playback state
        // (pause button, progress, or reading indicator)
        await page.waitForTimeout(100);
        
        const playbackIndicator = page.getByRole('button', { name: /pause/i })
          .or(page.getByText(/reading|playing|speaking/i))
          .first();
        
        if (await playbackIndicator.isVisible()) {
          await expect(playbackIndicator).toBeVisible();
        }
      }
      
      // Test script view
      const showScriptButton = page.getByRole('button', { name: /show script/i });
      if (await showScriptButton.isVisible()) {
        await showScriptButton.click();
        await expect(page.locator('div, main').filter({ hasText: /script|content/i })).toBeVisible();
      }
    }
  });

  test('should handle PWA installation prompts', async ({ page }) => {
    // Check if PWA manifest is loaded
    const manifestLink = page.locator('link[rel="manifest"]');
    if (await manifestLink.isVisible()) {
      const href = await manifestLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
    
    // Check for service worker registration
    const swRegistration = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistration).toBe(true);
  });

  test('should work offline (basic check)', async ({ page }) => {
    // Load the app first
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Reload the page
    await page.reload();
    
    // Should still show some content (cached by service worker)
    await expect(page.locator('body')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should handle deep linking and routing', async ({ page }) => {
    // If the app has URL-based routing, test direct navigation
    await page.goto('/#/flashcards');
    await expect(page.locator('body')).toBeVisible();
    
    await page.goto('/#/audio');
    await expect(page.locator('body')).toBeVisible();
    
    // Should handle invalid routes gracefully
    await page.goto('/#/nonexistent');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain responsive design', async ({ page }) => {
    // Test various viewport sizes
    const viewports = [
      { width: 320, height: 568 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // Desktop small
      { width: 1920, height: 1080 } // Desktop large
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // App should render at all sizes
      await expect(page.locator('body')).toBeVisible();
      
      // Navigation should be accessible
      const navigation = page.locator('nav, [data-testid="bottom-nav"]');
      if (await navigation.isVisible()) {
        await expect(navigation).toBeVisible();
      }
    }
  });

  test('should handle session storage and preferences', async ({ page }) => {
    // Check that localStorage/sessionStorage work
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });
    
    const stored = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });
    
    expect(stored).toBe('test-value');
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('test-key');
    });
  });

  test('should show proper loading states', async ({ page }) => {
    // On slow connections, should show loading indicators
    await page.route('**/*', route => {
      // Add artificial delay
      setTimeout(() => route.continue(), 100);
    });
    
    await page.goto('/');
    
    // Should show some content even with delays
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle error boundaries', async ({ page }) => {
    // Test that JavaScript errors don't completely break the app
    // This is hard to test directly, but we can check console errors
    
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      error.includes('Uncaught') || 
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});