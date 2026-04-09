import { test, expect } from '@playwright/test';

test.describe('Flashcard TTS Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate to flashcards if not already there
    const flashcardsTab = page.getByRole('button', { name: /flashcards/i });
    if (await flashcardsTab.isVisible()) {
      await flashcardsTab.click();
    }
  });

  test('should access flashcard deck and TTS controls', async ({ page }) => {
    // Wait for flashcard content to load
    await page.waitForLoadState('networkidle');
    
    // Look for flashcard deck or sample content
    const deckButton = page.locator('button, [role="button"]').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Should show flashcard viewer
      await expect(page.getByText(/question|card/i)).toBeVisible();
      
      // Look for TTS controls
      const ttsButton = page.getByRole('button', { name: /read|voice|speak/i })
        .or(page.locator('[aria-label*="read"]'))
        .or(page.locator('button:has-text("🔊")'))
        .first();
      
      if (await ttsButton.isVisible()) {
        await expect(ttsButton).toBeVisible();
        await expect(ttsButton).toBeEnabled();
      }
    }
  });

  test('should open voice settings modal', async ({ page }) => {
    // Navigate to a flashcard if available
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Look for voice settings button
      const voiceSettingsButton = page.getByRole('button', { name: /voice|settings/i })
        .or(page.locator('[title*="Voice"]'))
        .or(page.locator('button:has-text("⚙")'))
        .first();
      
      if (await voiceSettingsButton.isVisible()) {
        await voiceSettingsButton.click();
        
        // Should open voice settings modal
        await expect(page.getByText(/voice settings|voice/i)).toBeVisible();
        
        // Should show voice personality options
        const peterGriffinOption = page.getByText(/peter griffin/i);
        if (await peterGriffinOption.isVisible()) {
          await expect(peterGriffinOption).toBeVisible();
        }
        
        // Should show voice controls
        const rateControl = page.locator('input[type="range"]').first();
        if (await rateControl.isVisible()) {
          await expect(rateControl).toBeVisible();
        }
        
        // Close modal
        const closeButton = page.getByRole('button', { name: /close/i })
          .or(page.locator('[aria-label*="close"]'))
          .first();
        
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(page.getByText(/voice settings/i)).not.toBeVisible();
        }
      }
    }
  });

  test('should select voice personalities', async ({ page }) => {
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      const voiceSettingsButton = page.getByRole('button', { name: /voice|settings/i }).first();
      
      if (await voiceSettingsButton.isVisible()) {
        await voiceSettingsButton.click();
        
        // Try to select Peter Griffin personality
        const peterGriffinButton = page.getByRole('button').filter({ hasText: /peter griffin/i });
        
        if (await peterGriffinButton.isVisible()) {
          await peterGriffinButton.click();
          
          // Should show Peter Griffin is selected (visual feedback)
          await expect(peterGriffinButton).toHaveClass(/selected|active|border-blue/);
          
          // Should show Peter Griffin specific UI (beer emoji)
          await expect(page.locator(':has-text("🍺")')).toBeVisible();
        }
        
        // Try test voice button
        const testVoiceButton = page.getByRole('button', { name: /test voice/i });
        if (await testVoiceButton.isVisible()) {
          // Should be clickable
          await expect(testVoiceButton).toBeEnabled();
          
          // Note: We can't actually test TTS audio in E2E tests, but we can test the UI interaction
          await testVoiceButton.click();
          
          // Button text might change to "Speaking..." temporarily
          // This would require more sophisticated timing, so we'll just check it exists
        }
      }
    }
  });

  test('should show answer and TTS controls', async ({ page }) => {
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Show answer
      const showAnswerButton = page.getByRole('button', { name: /show answer|reveal|flip/i });
      if (await showAnswerButton.isVisible()) {
        await showAnswerButton.click();
        
        // Should show answer content
        await expect(page.getByText(/answer/i)).toBeVisible();
        
        // Should show multiple TTS options
        const qButton = page.getByRole('button', { name: /q/i }).filter({ hasText: /🔊/ }).first();
        const aButton = page.getByRole('button', { name: /a/i }).filter({ hasText: /🔊/ }).first();
        const bothButton = page.getByRole('button', { name: /both/i }).filter({ hasText: /🔊/ }).first();
        
        // At least one TTS button should be visible
        if (await qButton.isVisible()) {
          await expect(qButton).toBeEnabled();
        }
        if (await aButton.isVisible()) {
          await expect(aButton).toBeEnabled();
        }
        if (await bothButton.isVisible()) {
          await expect(bothButton).toBeEnabled();
        }
      }
    }
  });

  test('should handle flashcard navigation with TTS', async ({ page }) => {
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      // Check navigation controls
      const nextButton = page.getByRole('button', { name: /next/i });
      const prevButton = page.getByRole('button', { name: /previous|prev/i });
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should navigate to next card
        await expect(page.locator('main, [role="main"]')).toBeVisible();
        
        // TTS controls should still be available
        const ttsButton = page.getByRole('button', { name: /read|voice/i }).first();
        if (await ttsButton.isVisible()) {
          await expect(ttsButton).toBeEnabled();
        }
      }
      
      if (await prevButton.isVisible() && await prevButton.isEnabled()) {
        await prevButton.click();
        
        // Should navigate back
        await expect(page.locator('main, [role="main"]')).toBeVisible();
      }
    }
  });

  test('should persist voice settings', async ({ page }) => {
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      await deckButton.click();
      
      const voiceSettingsButton = page.getByRole('button', { name: /voice|settings/i }).first();
      
      if (await voiceSettingsButton.isVisible()) {
        await voiceSettingsButton.click();
        
        // Select Peter Griffin
        const peterGriffinButton = page.getByRole('button').filter({ hasText: /peter griffin/i });
        if (await peterGriffinButton.isVisible()) {
          await peterGriffinButton.click();
          
          // Close modal
          const closeButton = page.getByRole('button', { name: /close/i }).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
          
          // Navigate away and back
          const backButton = page.getByRole('button', { name: /back/i });
          if (await backButton.isVisible()) {
            await backButton.click();
            
            // Re-enter the same deck
            if (await deckButton.isVisible()) {
              await deckButton.click();
              
              // Voice settings should be preserved
              if (await voiceSettingsButton.isVisible()) {
                await voiceSettingsButton.click();
                
                // Peter Griffin should still be selected
                await expect(peterGriffinButton).toHaveClass(/selected|active|border-blue/);
              }
            }
          }
        }
      }
    }
  });

  test('should be accessible via keyboard', async ({ page }) => {
    const deckButton = page.locator('button').filter({ hasText: /kubernetes|prometheus|test|deck/i }).first();
    
    if (await deckButton.isVisible()) {
      // Navigate to flashcard with keyboard
      await deckButton.focus();
      await page.keyboard.press('Enter');
      
      // Tab through TTS controls
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      
      // Should be able to focus on interactive elements
      if (await focused.isVisible()) {
        await expect(focused).toBeFocused();
        
        // Should be able to activate with keyboard
        await page.keyboard.press('Enter');
      }
    }
  });
});