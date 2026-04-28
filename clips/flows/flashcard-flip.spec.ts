import { test } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { installFakeCursor, moveCursorTo } from '../helpers/cursor';
import { cleanFrame } from '../helpers/frame';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(
  resolve(__dirname, '..', 'fixtures', 'pages', 'flashcard-flip.html')
).toString();

declare global {
  interface Window {
    __clip: {
      flip: () => void;
      pressShow: () => void;
      pressGotIt: () => void;
      incGotIt: () => void;
      advanceCard: () => void;
    };
  }
}

test('flashcard flip + analogy reveal', async ({ page }) => {
  await page.goto(PAGE);
  await cleanFrame(page);
  await installFakeCursor(page);

  // 0.0s — page settles, cursor parked off the card
  await moveCursorTo(page, 1500, 200, 1);
  await page.waitForTimeout(800);

  // 1.0s — cursor moves toward the Show Answer button
  await moveCursorTo(page, 960, 880, 30);
  await page.waitForTimeout(400);

  // 1.6s — click the button (highlights), card flips
  await page.evaluate(() => window.__clip.pressShow());
  await page.evaluate(() => window.__clip.flip());
  await page.waitForTimeout(1100);

  // 2.7s — eye time on the answer (factual + analogy)
  await page.waitForTimeout(2800);

  // 5.5s — cursor moves to the Got It button
  await moveCursorTo(page, 1380, 950, 30);
  await page.waitForTimeout(400);

  // 6.0s — click Got It, counter bumps
  await page.evaluate(() => window.__clip.pressGotIt());
  await page.evaluate(() => window.__clip.incGotIt());
  await page.waitForTimeout(700);

  // 6.7s — advance to next card
  await page.evaluate(() => window.__clip.advanceCard());
  await moveCursorTo(page, 960, 540, 25);
  await page.waitForTimeout(2200);
});
