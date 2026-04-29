import { test, expect } from '@playwright/test';

/**
 * Golden Path E2E Test
 *
 * Tests the complete critical user journey:
 *   Sign in → enter content → generate flashcards + audio → view results
 *
 * All API calls are mocked at the network level via page.route().
 * This test runs against the static build (no backend needed).
 */

// Realistic mock data matching what OpenAI actually returns
const MOCK_USER = {
  id: 'user-e2e-golden',
  email: 'golden@test.local',
  name: 'Golden Path Tester',
  avatarUrl: null,
  creditBalanceCents: 50,
};

const MOCK_BILLING = {
  canGenerate: true,
  freeRemainingCents: 50,
  hasPaymentMethod: false,
  currentMonthUsageCents: 0,
};

const MOCK_FLASHCARD_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Stoicism Fundamentals',
          description: 'Key concepts of Stoic philosophy',
          cards: [
            {
              front: 'What is Stoicism?',
              back: 'An ancient Greek philosophy that teaches the development of self-control and fortitude.',
              difficulty: 'easy',
              tags: ['philosophy', 'basics'],
            },
            {
              front: 'Who founded Stoicism?',
              back: 'Zeno of Citium, around 300 BC in Athens.',
              difficulty: 'easy',
              tags: ['history'],
            },
            {
              front: 'What is the dichotomy of control?',
              back: 'The Stoic principle that we should focus only on what is within our control and accept what is not.',
              difficulty: 'medium',
              tags: ['core concepts'],
            },
          ],
          metadata: {
            difficulty: 'beginner',
            estimatedTime: 5,
            topics: ['philosophy', 'stoicism'],
          },
        }),
      },
    },
  ],
  usage: { prompt_tokens: 500, completion_tokens: 300 },
  model: 'gpt-4o',
};

const MOCK_AUDIO_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Understanding Stoicism',
          sections: [
            {
              heading: 'Introduction',
              content:
                "Welcome to this lesson on Stoicism. Imagine you're standing in an ancient Greek marketplace...",
            },
            {
              heading: 'Core Ideas',
              content:
                "The Stoics had a powerful idea: some things are up to us, and some things aren't. Think of it like weather...",
            },
          ],
          metadata: {
            estimatedDuration: 180,
            voiceInstructions: 'Warm, conversational tone',
            emphasis: ['dichotomy of control', 'virtue'],
          },
        }),
      },
    },
  ],
  usage: { prompt_tokens: 800, completion_tokens: 400 },
  model: 'gpt-4o',
};

const SAMPLE_TEXT = `Stoicism is a school of Hellenistic philosophy founded by Zeno of Citium in Athens in the early 3rd century BC.
It is a philosophy of personal virtue ethics informed by its system of logic and its views on the natural world,
asserting that the practice of virtue is both necessary and sufficient to achieve eudaimonia.
The Stoics identified the path to eudaimonia with a life spent practicing the cardinal virtues and living in
accordance with nature. The Stoics are especially known for teaching that virtue is the highest good.`;

test.describe('Golden Path: Full generation flow', () => {
  test('sign in → enter text → generate → view flashcards + audio', async ({
    page,
  }) => {
    let chatCallCount = 0;

    // === MOCK ALL API ENDPOINTS ===

    // Auth: return authenticated user
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      })
    );

    // Billing: return free allowance available
    await page.route('**/api/billing/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BILLING),
      })
    );

    // Chat proxy: first call returns flashcards, second returns audio script
    await page.route('**/api/proxy/chat', (route) => {
      chatCallCount++;
      const response =
        chatCallCount === 1
          ? MOCK_FLASHCARD_RESPONSE
          : MOCK_AUDIO_RESPONSE;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
        headers: { 'X-Credits-Remaining': '45' },
      });
    });

    // URL fetch proxy (not used in this test, but mock to prevent errors)
    await page.route('**/api/proxy/fetch-url', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: SAMPLE_TEXT }),
      })
    );

    // === STEP 1: Set up as authenticated managed user ===
    await page.goto('/');

    // Set localStorage to simulate managed path already selected
    await page.evaluate(() => {
      localStorage.setItem(
        'basecamp-byok-config',
        JSON.stringify({
          version: '2.0.0',
          setupPath: 'managed',
          aiProvider: null,
          voiceProvider: null,
        })
      );
    });

    // Reload to pick up the localStorage + mocked auth
    await page.reload();
    await page.waitForLoadState('networkidle');

    // === STEP 2: Verify authenticated state ===
    // Header should show the free balance (visible on all screen sizes)
    await expect(
      page.getByText('$0.50 left')
    ).toBeVisible({ timeout: 10000 });

    // Should be on the input page (not setup/welcome)
    await expect(page.getByText('Learn Anything')).toBeVisible({
      timeout: 5000,
    });

    // === STEP 3: Enter content ===
    // Click "Paste Content" tab
    const pasteTab = page.getByText('Paste Content');
    if (await pasteTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pasteTab.click();
    }

    // Enter text content
    const textarea = page.locator('textarea');
    await textarea.fill(SAMPLE_TEXT);

    // === STEP 4: Generate content ===
    const generateButton = page.getByRole('button', {
      name: /Generate/i,
    });
    await expect(generateButton).toBeEnabled({ timeout: 5000 });
    await generateButton.click();

    // === STEP 5: Wait for generation to complete ===
    // Lands directly on the Audio tab (the SLC default — empty Overview is gone).
    // The AudioPlayer header shows the audio briefing's title.
    await expect(
      page.getByText('Understanding Stoicism')
    ).toBeVisible({ timeout: 30000 });

    // === STEP 6: Tab selector should be pinned at top — switch to Study Cards ===
    const studyCardsTab = page.getByRole('button', { name: 'Study Cards' });
    await expect(studyCardsTab).toBeVisible({ timeout: 5000 });
    await studyCardsTab.click();

    // Verify a flashcard question is visible (use .first() — text appears in card + nav)
    await expect(
      page.getByText('What is Stoicism?').first()
    ).toBeVisible({ timeout: 5000 });

    // === STEP 7: Switch back to Audio via the tab selector ===
    const audioTab = page.getByRole('button', { name: 'Audio' });
    await expect(audioTab).toBeVisible({ timeout: 5000 });
    await audioTab.click();
    await expect(
      page.getByText('Understanding Stoicism')
    ).toBeVisible({ timeout: 5000 });

    // === STEP 8: Verify header navigation still works ===
    const newButton = page.getByRole('button', { name: 'New' });
    if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newButton.click();
      await expect(
        page.getByRole('heading', { name: /Learn Anything/i })
      ).toBeVisible({ timeout: 5000 });
    }

    // Click "Current" in the header to go back to generated content
    // (renamed from "My Content" in the SLC simplification PR)
    const currentButton = page.getByRole('button', { name: 'Current' });
    if (await currentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await currentButton.click();
      await expect(
        page.getByText('Understanding Stoicism')
      ).toBeVisible({ timeout: 5000 });
    }

    // === GOLDEN PATH COMPLETE ===
  });
});
