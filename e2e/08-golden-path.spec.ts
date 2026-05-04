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
      // Audio-first pipeline: first chat call generates the audio briefing,
      // second generates flashcards downstream from that audio.
      const response =
        chatCallCount === 1
          ? MOCK_AUDIO_RESPONSE
          : MOCK_FLASHCARD_RESPONSE;
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

    // Inject a synthetic user profile so onboarding is skipped — test
    // lands directly at the topic-input step. (Auth itself is handled
    // by the /api/auth/me mock above.)
    await page.evaluate(() => {
      localStorage.setItem(
        'basecamp-user-profile',
        JSON.stringify({
          name: 'Tester',
          profession: 'engineer',
          expertise: 'distributed systems',
          intent: 'exploring stoicism',
          completedAt: new Date().toISOString(),
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

    // Should be on the input page — the topic-input textarea is visible.
    // (No more "Learn Anything" h1 / "Paste Content" tab — auto-detect
    // handles URL vs topic vs text from a single slot.)
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // === STEP 3: Enter content ===
    // Paste a long-text block. SAMPLE_TEXT is >50 chars + multi-line, so
    // the band auto-detects text mode (no toggle needed).
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

    // === STEP 6: Verify header navigation still works ===
    // SLC launch hides the Audio ↔ Study Cards toggle (FEATURES.showStudyCardsToggle
    // is false). The mid-listen flashcard checkpoints are the only way to study;
    // a separate study tab dilutes the offer. Steps 6–7 of the previous test
    // (toggle Audio/Study Cards) are dropped accordingly.
    const newButton = page.getByRole('button', { name: 'New' });
    if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newButton.click();
      // Topic-input page — confirm the textarea is back on screen.
      await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 });
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
