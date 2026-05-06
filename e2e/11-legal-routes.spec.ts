import { test, expect } from '@playwright/test';

/**
 * Legal-pages route smoke test.
 *
 * Locks that /privacy and /terms render their respective pages with
 * real content (not the SPA fallback or a 404), and that the back link
 * returns to /.
 *
 * No auth mocks needed — legal pages render regardless of session
 * state. They short-circuit App.tsx before AppMain mounts.
 */

test.describe('Legal routes', () => {
  test('/privacy renders the Privacy Policy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /Privacy Policy/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/last updated May 2026/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /What we collect/i })).toBeVisible();
    await expect(page.getByText(/hello@basecamp\.app/i).first()).toBeVisible();

    // Back link returns to /.
    await page.getByRole('link', { name: /back to basecamp/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('/terms renders the Terms of Service', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /Terms of Service/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/last updated May 2026/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Free tier and pricing/i })).toBeVisible();
    await expect(page.getByText(/hello@basecamp\.app/i).first()).toBeVisible();
  });
});
