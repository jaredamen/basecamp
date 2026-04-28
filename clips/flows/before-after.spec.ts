import { test } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cleanFrame } from '../helpers/frame';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE = pathToFileURL(
  resolve(__dirname, '..', 'fixtures', 'pages', 'before-after.html')
).toString();

test('before-after slop vs analogy', async ({ page }) => {
  await page.goto(PAGE);
  await cleanFrame(page);
  await page.waitForTimeout(400);

  await page.evaluate(() => (window as unknown as { __clip: { showTitle: () => void } }).__clip.showTitle());
  await page.waitForTimeout(900);

  await page.evaluate(() => (window as unknown as { __clip: { showSlop: () => void } }).__clip.showSlop());
  await page.waitForTimeout(2400);

  await page.evaluate(() => (window as unknown as { __clip: { showBc: () => void } }).__clip.showBc());
  await page.waitForTimeout(500);
  await page.evaluate(() => (window as unknown as { __clip: { runType: () => void } }).__clip.runType());
  await page.waitForTimeout(6500);

  await page.evaluate(() => (window as unknown as { __clip: { showFooter: () => void } }).__clip.showFooter());
  await page.waitForTimeout(2200);
});
