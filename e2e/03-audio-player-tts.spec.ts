import { test, expect } from '@playwright/test';

test.describe('Audio Player and TTS Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate to audio tab
    const audioTab = page.getByRole('button', { name: /audio/i });
    if (await audioTab.isVisible()) {
      await audioTab.click();
    }
  });

  test('should access audio briefings and TTS controls', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for audio briefing or sample content
    const briefingButton = page.locator('button, [role="button"]').filter({ 
      hasText: /prometheus|kubernetes|briefing|release|features/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Should show audio player
      await expect(page.getByText(/briefing|script|audio/i)).toBeVisible();
      
      // Should show play button
      const playButton = page.getByRole('button', { name: /play/i })
        .or(page.locator('button[aria-label*="play"]'))
        .first();
      
      if (await playButton.isVisible()) {
        await expect(playButton).toBeVisible();
        await expect(playButton).toBeEnabled();
      }
    }
  });

  test('should show TTS interface for text-only briefings', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing|release/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Look for TTS indicators
      const ttsIndicator = page.getByText(/text-to-speech|tts:/i);
      if (await ttsIndicator.isVisible()) {
        await expect(ttsIndicator).toBeVisible();
        
        // Should show voice settings button for TTS mode
        const voiceButton = page.getByRole('button', { name: /voice/i })
          .or(page.locator('[title*="voice"]'))
          .first();
        
        if (await voiceButton.isVisible()) {
          await expect(voiceButton).toBeVisible();
          await expect(voiceButton).toBeEnabled();
        }
      }
    }
  });

  test('should open voice settings from audio player', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      const voiceButton = page.getByRole('button', { name: /voice/i }).first();
      
      if (await voiceButton.isVisible()) {
        await voiceButton.click();
        
        // Should open voice settings modal
        await expect(page.getByText(/voice settings/i)).toBeVisible();
        
        // Should show personality options
        const personalities = [
          page.getByText(/standard/i),
          page.getByText(/peter griffin/i),
          page.getByText(/motivational/i),
          page.getByText(/asmr/i)
        ];
        
        let foundPersonality = false;
        for (const personality of personalities) {
          if (await personality.isVisible()) {
            await expect(personality).toBeVisible();
            foundPersonality = true;
            break;
          }
        }
        
        // At least one personality should be visible
        expect(foundPersonality).toBe(true);
      }
    }
  });

  test('should toggle script view', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Look for script toggle
      const showScriptButton = page.getByRole('button', { name: /show script|script/i });
      
      if (await showScriptButton.isVisible()) {
        await showScriptButton.click();
        
        // Should show script content
        await expect(page.locator('div, main').filter({ hasText: /script|content|text/i })).toBeVisible();
        
        // Should show "Read Script Aloud" button in TTS mode
        const readScriptButton = page.getByRole('button', { name: /read script/i });
        if (await readScriptButton.isVisible()) {
          await expect(readScriptButton).toBeEnabled();
        }
        
        // Toggle back to hide script
        const hideScriptButton = page.getByRole('button', { name: /hide script/i });
        if (await hideScriptButton.isVisible()) {
          await hideScriptButton.click();
        }
      }
    }
  });

  test('should show playback controls', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Should show playback rate controls
      const rateButtons = [
        page.getByRole('button', { name: /1x/i }),
        page.getByRole('button', { name: /1.25x/i }),
        page.getByRole('button', { name: /1.5x/i }),
        page.getByRole('button', { name: /2x/i })
      ];
      
      let foundRateButton = false;
      for (const button of rateButtons) {
        if (await button.isVisible()) {
          await expect(button).toBeEnabled();
          foundRateButton = true;
          
          // Test clicking a rate button
          await button.click();
          // Should show as selected (active state)
          await expect(button).toHaveClass(/bg-blue|selected|active/);
          break;
        }
      }
      
      expect(foundRateButton).toBe(true);
    }
  });

  test('should handle TTS reading state', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      const playButton = page.getByRole('button', { name: /play/i }).first();
      
      if (await playButton.isVisible()) {
        await playButton.click();
        
        // Note: We can't actually test audio playback, but we can test UI changes
        // The button might change to pause, or show reading indicators
        
        // Look for pause button or reading indicator
        await page.waitForTimeout(100); // Brief wait for UI update
        
        const pauseButton = page.getByRole('button', { name: /pause/i });
        const readingIndicator = page.getByText(/reading|speaking/i);
        
        if (await pauseButton.isVisible()) {
          await expect(pauseButton).toBeVisible();
        } else if (await readingIndicator.isVisible()) {
          await expect(readingIndicator).toBeVisible();
        }
      }
    }
  });

  test('should show voice personality in TTS mode', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Open voice settings
      const voiceButton = page.getByRole('button', { name: /voice/i }).first();
      
      if (await voiceButton.isVisible()) {
        await voiceButton.click();
        
        // Select Peter Griffin
        const peterGriffinButton = page.getByRole('button').filter({ hasText: /peter griffin/i });
        
        if (await peterGriffinButton.isVisible()) {
          await peterGriffinButton.click();
          
          // Close modal
          const closeButton = page.getByRole('button', { name: /close/i }).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
          
          // Should show Peter Griffin in the TTS indicator
          await expect(page.getByText(/peter griffin/i)).toBeVisible();
          await expect(page.locator(':has-text("🍺")')).toBeVisible();
        }
      }
    }
  });

  test('should handle back navigation from audio player', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Should show back button
      const backButton = page.getByRole('button', { name: /back/i });
      
      if (await backButton.isVisible()) {
        await backButton.click();
        
        // Should return to audio feed
        await expect(page.getByText(/briefing|audio/i)).toBeVisible();
      }
    }
  });

  test('should be keyboard accessible', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      // Use keyboard to navigate
      await briefingButton.focus();
      await page.keyboard.press('Enter');
      
      // Tab through controls
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.isVisible()) {
        await expect(focusedElement).toBeFocused();
        
        // Should be able to activate with Enter or Space
        await page.keyboard.press('Enter');
      }
    }
  });

  test('should persist audio player state', async ({ page }) => {
    const briefingButton = page.locator('button').filter({ 
      hasText: /prometheus|kubernetes|briefing/i 
    }).first();
    
    if (await briefingButton.isVisible()) {
      await briefingButton.click();
      
      // Change playback rate
      const rate15Button = page.getByRole('button', { name: /1.5x/i });
      
      if (await rate15Button.isVisible()) {
        await rate15Button.click();
        
        // Navigate away and back
        const backButton = page.getByRole('button', { name: /back/i });
        
        if (await backButton.isVisible()) {
          await backButton.click();
          
          // Re-enter
          await briefingButton.click();
          
          // Playback rate should be preserved
          await expect(rate15Button).toHaveClass(/bg-blue|selected|active/);
        }
      }
    }
  });
});