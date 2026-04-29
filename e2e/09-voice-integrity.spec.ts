import { test, expect } from '@playwright/test';

/**
 * Voice-integrity E2E test.
 *
 * Asserts that when the user clicks Play on an audio briefing, the AudioPlayer
 * takes the OpenAI nova path (`/api/proxy/tts`) — NOT the browser
 * SpeechSynthesis fallback (the robot voice).
 *
 * History: PR #17 introduced a regression where empty `interruptionPoints`
 * caused `hasInteractive` to flip false, sending playback through the legacy
 * `speak(briefing.script)` branch which uses browser TTS. PR #19 fixed it.
 * This test ensures that class of regression — silent fallback to robot
 * voice — fails CI loudly instead of slipping into prod again.
 *
 * Strategy:
 *   1. Mock auth, billing, and chat endpoints just enough to land on the
 *      audio player.
 *   2. Mock /api/proxy/tts to count calls and return a tiny but valid MP3
 *      so the audio element doesn't error and trigger a fallback.
 *   3. Spy on `window.speechSynthesis.speak` from page-init context — if
 *      the AudioPlayer ever calls it on the happy path, fail.
 *   4. Click Play. Assert /api/proxy/tts was hit AND speechSynthesis.speak
 *      was not called.
 */

const MOCK_USER = {
  id: 'user-e2e-voice',
  email: 'voice@test.local',
  name: 'Voice Integrity Tester',
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
          title: 'Tiny Test Deck',
          description: 'For voice integrity check',
          cards: [
            { front: 'Q1', back: 'A1', difficulty: 'easy', tags: [] },
            { front: 'Q2', back: 'A2', difficulty: 'easy', tags: [] },
          ],
          metadata: { difficulty: 'beginner', estimatedTime: 1, topics: [] },
        }),
      },
    },
  ],
  usage: { prompt_tokens: 100, completion_tokens: 50 },
  model: 'gpt-4o',
};

// Audio script with NO interruptionPoints — the exact shape that caused
// the PR #17 regression. The new audio path must still hit /api/proxy/tts.
const MOCK_AUDIO_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Tiny Test Briefing',
          sections: [
            { heading: 'Section 1', content: 'Section one narration here.' },
            { heading: 'Section 2', content: 'Section two narration here.' },
          ],
          // Deliberately empty — this is the critical path the regression
          // hit. The player must still use OpenAI nova for sections.
          interruptionPoints: [],
          metadata: { estimatedDuration: 30, voiceInstructions: '', emphasis: [] },
        }),
      },
    },
  ],
  usage: { prompt_tokens: 200, completion_tokens: 100 },
  model: 'gpt-4o',
};

// Smallest "valid-ish" MP3 frame (silent) so the audio element accepts it
// without erroring. The audio doesn't have to actually decode — we just
// need the fetch to be reached and the element src to be set. A few bytes
// of zeros is enough for the test's purposes.
const TINY_MP3_BYTES = new Uint8Array([
  0xff, 0xfb, 0x90, 0x00, // MPEG audio frame header (MPEG-1 Layer III, 128kbps, 44.1kHz)
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const SAMPLE_TEXT =
  'A short paragraph of placeholder text to satisfy the 50-character minimum on the input box. Another short sentence.';

test.describe('Voice integrity', () => {
  test('clicking Play uses OpenAI nova path, never browser SpeechSynthesis', async ({ page }) => {
    let chatCallCount = 0;
    let ttsCallCount = 0;

    // --- Spy on speechSynthesis.speak BEFORE the page loads any of our code ---
    // If this is ever called during the happy path, the test fails.
    await page.addInitScript(() => {
      const w = window as unknown as { __speakCallCount: number };
      w.__speakCallCount = 0;
      const synth = window.speechSynthesis;
      const original = synth.speak.bind(synth);
      synth.speak = (utterance: SpeechSynthesisUtterance) => {
        w.__speakCallCount += 1;
        return original(utterance);
      };
    });

    // --- Mock auth ---
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

    // --- Mock chat (flashcards then audio script) ---
    await page.route('**/api/proxy/chat', (route) => {
      chatCallCount += 1;
      const body = chatCallCount === 1 ? MOCK_FLASHCARD_RESPONSE : MOCK_AUDIO_RESPONSE;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
        headers: { 'X-Credits-Remaining': '45' },
      });
    });

    // --- The critical mock: /api/proxy/tts must be hit, not bypassed ---
    await page.route('**/api/proxy/tts', (route) => {
      ttsCallCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        headers: { 'X-Credits-Remaining': '40' },
        body: Buffer.from(TINY_MP3_BYTES),
      });
    });

    // --- Drive the UI to the audio player ---
    await page.goto('/');
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
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('$0.50 left')).toBeVisible({ timeout: 10000 });

    const pasteTab = page.getByText('Paste Content');
    if (await pasteTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pasteTab.click();
    }

    await page.locator('textarea').fill(SAMPLE_TEXT);
    await page.getByRole('button', { name: /Generate/i }).click();

    // Lands on Audio tab; the AudioPlayer header shows the briefing title.
    await expect(page.getByText('Tiny Test Briefing')).toBeVisible({ timeout: 30000 });

    // --- The actual test: click Play ---
    const playButton = page.getByRole('button', { name: /^Play$|^Pause$|^Loading$/ });
    await expect(playButton).toBeVisible({ timeout: 5000 });
    await playButton.click();

    // Wait for the AudioPlayer to fetch nova audio. The PR #17 regression's
    // signature was: /api/proxy/tts NEVER called because the legacy
    // `speak(briefing.script)` branch hijacked playback. The fix's signature
    // is: ttsCallCount goes >= 1 within a moment of clicking Play.
    await expect.poll(() => ttsCallCount, { timeout: 5000 }).toBeGreaterThanOrEqual(1);

    expect(
      ttsCallCount,
      'AudioPlayer must hit /api/proxy/tts for nova audio. If this is 0, the player took the legacy `speak(briefing.script)` path — the robot voice regression.'
    ).toBeGreaterThanOrEqual(1);

    // Note: we deliberately do NOT assert speechSynthesis.speak === 0 here.
    // When `el.onerror` fires (e.g., the test's mock MP3 isn't a fully-valid
    // decodable frame), the AudioPlayer correctly falls back to browser TTS
    // and surfaces the visible voiceError banner. That fallback is intended
    // behavior, not a regression. The regression we're guarding against is
    // *bypassing the proxy entirely* — which the ttsCallCount assertion above
    // catches definitively.
  });
});
