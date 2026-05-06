import { test, expect } from '@playwright/test';

/**
 * Landing-page smoke test for unauthenticated visitors.
 *
 * Locks the visible surface for visitors who hit `/` without a session:
 *   - hero copy + Continue with Google CTA above the fold
 *   - "How it works" 3-step section
 *   - Pricing with 3 tiers (Free / Lifetime / Monthly)
 *   - FAQ section
 *
 * The /api/auth/me endpoint is mocked to return 401 so the app stays in
 * the unauthenticated state.
 */

test.describe('Landing page (unauthenticated)', () => {
  test('renders hero + how-it-works + pricing + faq for visitors', async ({ page }) => {
    // Force unauthenticated state.
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );
    await page.route('**/api/billing/status', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero — headline + primary CTA above the fold.
    await expect(page.getByRole('heading', { name: /Listen to anything/i })).toBeVisible();
    const ctaButtons = page.getByRole('button', { name: /Continue with Google/i });
    await expect(ctaButtons.first()).toBeVisible();

    // CTA appears multiple times (hero + final). At least 2 instances.
    expect(await ctaButtons.count()).toBeGreaterThanOrEqual(2);

    // How it works — three step headings.
    await expect(page.getByText(/from topic to retention/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Paste any topic/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Listen to your briefing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Get quizzed mid-listen/i })).toBeVisible();

    // Pricing — three tiers.
    await expect(page.getByText(/Free to start/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Start free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Get lifetime/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Go monthly/i })).toBeVisible();

    // Free tier mentions the add-card path (was a hard wall in PR 9).
    await expect(page.getByText(/Add a card to keep going/i)).toBeVisible();

    // Chrome extension is marked coming soon, not advertised as live.
    await expect(page.getByText(/Browser extension \(coming soon\)/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Chrome extension launching soon/i })).toBeVisible();

    // Demo strip is present (replaces the dead "scroll for the demo" promise).
    await expect(page.getByText(/What it actually feels like/i)).toBeVisible();

    // FAQ — first answer is open by default.
    await expect(page.getByText(/Quick answers/i)).toBeVisible();
    await expect(page.getByText(/Do I need to install anything/i)).toBeVisible();

    // Footer.
    await expect(page.getByText(/© basecamp/i)).toBeVisible();
  });
});
