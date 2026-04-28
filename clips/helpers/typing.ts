import type { Locator, Page } from '@playwright/test';

interface TypeHumanlyOptions {
  meanDelayMs?: number;
  varianceMs?: number;
}

/**
 * Type into a locator at a human-ish pace. Default ~70ms/char with ±30ms jitter.
 * Avoids the "robot dumping the entire string at once" look that breaks
 * marketing footage believability.
 */
export async function typeHumanly(
  locator: Locator,
  text: string,
  { meanDelayMs = 70, varianceMs = 30 }: TypeHumanlyOptions = {}
): Promise<void> {
  await locator.click();
  for (const ch of text) {
    const jitter = (Math.random() * 2 - 1) * varianceMs;
    await locator.page().keyboard.type(ch, { delay: 0 });
    await locator.page().waitForTimeout(Math.max(20, meanDelayMs + jitter));
  }
}

/**
 * Beat: wait a moment so the eye can register what just changed on screen.
 * Use between distinct steps in a flow. Default 600ms feels natural for video.
 */
export async function beat(page: Page, ms = 600): Promise<void> {
  await page.waitForTimeout(ms);
}
