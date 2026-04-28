import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(__dirname, '..', 'fixtures');

/**
 * Intercept all calls matching urlPattern and return the JSON file at
 * fixtures/responses/<name>.json. Used to freeze LLM responses so every
 * take of a clip produces identical analogy/script/quiz output.
 */
export function fulfillJsonFixture(page: Page, urlPattern: string | RegExp, fixtureName: string) {
  const path = resolve(FIXTURES_ROOT, 'responses', `${fixtureName}.json`);
  const body = readFileSync(path, 'utf8');
  return page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });
}

/**
 * Intercept TTS calls and return a pre-rendered MP3 fixture. Avoids paying
 * TTS credits per re-take and keeps audio output deterministic.
 */
export function fulfillAudioFixture(page: Page, urlPattern: string | RegExp, fixtureName: string) {
  const path = resolve(FIXTURES_ROOT, 'audio', `${fixtureName}.mp3`);
  const body = readFileSync(path);
  return page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body,
    });
  });
}

/**
 * Stub an arbitrary inline JSON response. Use when you need a one-off mock
 * and don't want a separate fixture file.
 */
export function fulfillInlineJson(page: Page, urlPattern: string | RegExp, payload: unknown) {
  return page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}
