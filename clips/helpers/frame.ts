import type { Page } from '@playwright/test';

/**
 * Apply visual cleanup to the page so the recording looks like polished
 * marketing footage and not a debug screenshot:
 *   - hide scrollbars
 *   - hide native cursor (we use a fake injected one)
 *   - disable CSS animations on top-level chrome (status bars, toasts)
 *
 * Call once per page, after navigation, before any interactions.
 */
export async function cleanFrame(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        cursor: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
      }
      html {
        scrollbar-width: none !important;
      }
      /* Suppress dev-only banners if any sneak in */
      [data-dev-banner], [data-vite-dev-id] {
        display: none !important;
      }
    `,
  });
}
