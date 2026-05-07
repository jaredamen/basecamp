import { test, expect } from '@playwright/test';

/**
 * Locks the inline `[technical]` flag detection on TopicInputBand.
 *
 * The chip is a tight visual confirmation that the flag was recognized
 * and stripped from the LLM-bound content. We test the chip toggle
 * deterministically (no LLM call needed) — the prompt-side behavior is
 * covered by unit tests in tests/services/aiPrompting.test.ts.
 */

const MOCK_USER = {
  id: 'user-e2e-technical',
  email: 'tech@test.local',
  name: 'Technical Tester',
  avatarUrl: null,
  creditBalanceCents: 50,
};

const MOCK_BILLING = {
  canGenerate: true,
  freeRemainingCents: 50,
  hasPaymentMethod: false,
  currentMonthUsageCents: 0,
};

test.describe('Technical depth flag — input UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      })
    );
    await page.route('**/api/billing/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BILLING),
      })
    );

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basecamp-user-profile',
        JSON.stringify({
          name: 'Tester',
          profession: 'engineer',
          expertise: 'distributed systems',
          intent: 'learning',
          completedAt: new Date().toISOString(),
        })
      );
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('shows the technical-depth chip when [technical] is typed', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // No flag → no chip.
    await textarea.fill('explain idempotency keys');
    await expect(page.getByTestId('technical-depth-chip')).toHaveCount(0);

    // [technical] → chip visible.
    await textarea.fill('[technical] explain idempotency keys');
    await expect(page.getByTestId('technical-depth-chip')).toBeVisible();

    // [tech] short form → chip stays.
    await textarea.fill('[tech] WebSocket subprotocols');
    await expect(page.getByTestId('technical-depth-chip')).toBeVisible();

    // --technical → chip stays.
    await textarea.fill('explain --technical caching strategies');
    await expect(page.getByTestId('technical-depth-chip')).toBeVisible();

    // Remove the flag → chip disappears.
    await textarea.fill('explain caching strategies');
    await expect(page.getByTestId('technical-depth-chip')).toHaveCount(0);
  });

  test('flag does not break URL detection (mode hint reflects cleaned input)', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // [technical] + URL → mode hint says "URL detected", proving the
    // flag was stripped before mode detection ran. Without the strip,
    // the leading `[technical] ` would push it to topic or text mode.
    await textarea.fill('[technical] https://en.wikipedia.org/wiki/Idempotence');
    await expect(page.getByText('URL detected')).toBeVisible();
    await expect(page.getByTestId('technical-depth-chip')).toBeVisible();

    // Generate stays enabled (cleaned URL is the only content that
    // reaches the canGenerate gate).
    await expect(page.getByRole('button', { name: /Generate/i })).toBeEnabled();
  });
});
