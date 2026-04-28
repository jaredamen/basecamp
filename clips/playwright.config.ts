import { defineConfig, devices } from '@playwright/test';

/**
 * Marketing clip recording config.
 *
 * Separate from the root playwright.config.ts (which runs e2e tests).
 * Invoked via `npm run clips:record`.
 *
 * Output WebMs land in clips/output/webm/<flow>/, then ffmpeg converts to mp4.
 */
export default defineConfig({
  testDir: './flows',
  outputDir: './output/webm',
  timeout: 120 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.CLIPS_BASE_URL ?? 'http://localhost:4173',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    headless: true,
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      slowMo: 50,
      args: [
        '--hide-scrollbars',
        '--disable-blink-features=AutomationControlled',
      ],
    },
  },
  projects: [
    {
      name: 'clips',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer here. Clips that use file:// fixtures (clip 1) don't need
  // a server. Clips that drive the live app (clips 2 + 3) require the
  // preview server running separately:
  //
  //   npm run build && npm run preview     (separate terminal)
  //   npm run clips:record
});
