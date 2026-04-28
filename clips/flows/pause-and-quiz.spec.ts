import { test } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { installFakeCursor, moveCursorTo } from '../helpers/cursor';
import { cleanFrame } from '../helpers/frame';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(
  resolve(__dirname, '..', 'fixtures', 'pages', 'pause-and-quiz.html')
).toString();

declare global {
  interface Window {
    __clip: {
      show: (sceneId: string) => void;
      clickExt: () => void;
      runTranscript: () => void;
      advanceProgress: (pct: number) => void;
      pauseAudio: () => void;
      resumeAudio: () => void;
      showQuiz: () => void;
      hideQuiz: () => void;
      hoverChoice: (id: string) => void;
      selectChoice: (id: string) => void;
    };
  }
}

test('pause-and-quiz hero', async ({ page }) => {
  await page.goto(PAGE);
  await cleanFrame(page);
  await installFakeCursor(page);

  // ───── Scene 1: Browser with Wikipedia (0–2.5s) ─────
  await page.evaluate(() => window.__clip.show('scene-browser'));
  await moveCursorTo(page, 1500, 600, 1);
  await page.waitForTimeout(1500);

  // Cursor swings up to the extension icon, clicks
  await moveCursorTo(page, 1820, 50, 35);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__clip.clickExt());
  await page.waitForTimeout(450);

  // ───── Scene 2: Basecamp loading (2.5–4.5s) ─────
  await page.evaluate(() => window.__clip.show('scene-loading'));
  await moveCursorTo(page, 1500, 800, 1);  // park cursor off-screen
  await page.waitForTimeout(1700);

  // ───── Scene 3: Audio playing (4.5–9.5s) ─────
  await page.evaluate(() => window.__clip.show('scene-audio'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__clip.runTranscript());
  // Animate progress bar over the audio play period
  for (let pct = 28; pct <= 60; pct += 8) {
    await page.evaluate((p) => window.__clip.advanceProgress(p), pct);
    await page.waitForTimeout(700);
  }

  // ───── Scene 3b: Audio pauses, quiz appears (9.5–11s) ─────
  await page.evaluate(() => window.__clip.pauseAudio());
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__clip.showQuiz());
  await page.waitForTimeout(1100);

  // ───── Scene 3c: Cursor scans choices, lands on correct, taps (11–14.5s) ─────
  await moveCursorTo(page, 800, 540, 30);  // hover near choice A
  await page.evaluate(() => window.__clip.hoverChoice('choiceA'));
  await page.waitForTimeout(500);

  await moveCursorTo(page, 800, 640, 30);  // move to choice B (correct)
  await page.evaluate(() => window.__clip.hoverChoice('choiceB'));
  await page.waitForTimeout(700);

  // Click correct
  await page.evaluate(() => window.__clip.selectChoice('choiceB'));
  await page.waitForTimeout(1300);

  // ───── Scene 3d: Quiz fades, audio resumes briefly (14.5–16s) ─────
  await page.evaluate(() => window.__clip.hideQuiz());
  await page.evaluate(() => window.__clip.resumeAudio());
  await page.evaluate(() => window.__clip.advanceProgress(72));
  await moveCursorTo(page, 1500, 800, 1);  // park cursor
  await page.waitForTimeout(1500);

  // ───── Scene 4: Closing tagline (16–19s) ─────
  await page.evaluate(() => window.__clip.show('scene-tagline'));
  await page.waitForTimeout(2400);
});
