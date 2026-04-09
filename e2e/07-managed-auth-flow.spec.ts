import { test, expect } from '@playwright/test';

// These tests mock the auth API at the network level so they work with the
// static preview server (no real backend needed). For full integration testing
// with the real API, run `vercel dev` + `npm run dev` and use the dev-login endpoint.

const mockUser = {
  id: 'user-e2e-123',
  email: 'e2e@test.local',
  name: 'E2E Test User',
  avatarUrl: null,
  creditBalanceCents: 500,
};

test.describe('Managed Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show sign-in screen when selecting managed path', async ({ page }) => {
    // Mock /api/auth/me to return 401 (not authenticated)
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Not authenticated"}' })
    );

    await page.waitForLoadState('networkidle');

    // Navigate to setup: Get Started -> setup path selection
    await page.getByRole('button', { name: /Get Started/i }).click();

    // Fill in profile name to get past profile setup
    const nameInput = page.getByPlaceholder(/your name/i);
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test User');
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
      }
    }

    // Look for the managed/"Quick Setup" option
    const managedOption = page.getByText(/Quick Setup/i).or(page.getByText(/Keep it simple/i));
    if (await managedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await managedOption.click();
    }

    // Should eventually see the sign-in button
    await expect(page.getByText(/Sign in with Google/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show authenticated state after successful auth', async ({ page }) => {
    // Mock /api/auth/me to return an authenticated user
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      })
    );

    await page.waitForLoadState('networkidle');

    // Navigate to managed setup
    await page.getByRole('button', { name: /Get Started/i }).click();

    const nameInput = page.getByPlaceholder(/your name/i);
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test User');
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
      }
    }

    const managedOption = page.getByText(/Quick Setup/i).or(page.getByText(/Keep it simple/i));
    if (await managedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await managedOption.click();
    }

    // Since the user is "authenticated" with credits, should see welcome/completion
    await expect(
      page.getByText(/E2E Test User/i).or(page.getByText(/e2e@test.local/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show add credits prompt when authenticated with zero balance', async ({ page }) => {
    // Mock /api/auth/me with zero credits
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockUser, creditBalanceCents: 0 }),
      })
    );

    await page.waitForLoadState('networkidle');

    // Navigate to managed setup
    await page.getByRole('button', { name: /Get Started/i }).click();

    const nameInput = page.getByPlaceholder(/your name/i);
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test User');
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
      }
    }

    const managedOption = page.getByText(/Quick Setup/i).or(page.getByText(/Keep it simple/i));
    if (await managedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await managedOption.click();
    }

    // Should see the "Add Credits" prompt
    await expect(page.getByText(/Add Credits/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle auth=success URL parameter', async ({ page }) => {
    // Mock authenticated user
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      })
    );

    // Simulate returning from Google OAuth with auth=success
    await page.goto('/?auth=success');

    // The URL should be cleaned up (no auth param)
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('auth=success');
  });
});
