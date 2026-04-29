import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Voice-integrity contract tests.
 *
 * The product voice is OpenAI nova on the `tts-1-hd` model. If anyone
 * reverts the model, drops the price, or breaks the proxy passthrough,
 * CI must fail loudly here — not silently in production via the browser
 * SpeechSynthesis fallback (the robot voice).
 *
 * History: PR #15 fixed the model. PR #17 introduced a regression that
 * silently fell back to robot voice when interruptionPoints were empty.
 * Tests like these are how we keep voice quality from regressing.
 */
describe('voice-integrity contract', () => {
  // lib/config requires real env vars when accessed lazily, so stub them
  // for module load. Only the OpenAI block is exercised here.
  const ENV_KEYS_TO_STUB = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_METERED_PRICE_ID',
  ];

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('locks the TTS model to tts-1-hd (not tts-1)', async () => {
    for (const k of ENV_KEYS_TO_STUB) vi.stubEnv(k, 'test');
    const { config } = await import('../../lib/config.ts');
    expect(config.openai.ttsModel).toBe('tts-1-hd');
  });

  it('locks the product voice to nova', async () => {
    for (const k of ENV_KEYS_TO_STUB) vi.stubEnv(k, 'test');
    const { config } = await import('../../lib/config.ts');
    expect(config.openai.ttsDefaultVoice).toBe('nova');
  });

  it('keeps the TTS price aligned with tts-1-hd ($30 / 1M chars)', async () => {
    // tts-1-hd = $30 per 1M chars = $0.000030 per char.
    // If ttsModel is bumped, this must move with it. If price falls behind,
    // we're losing margin silently.
    for (const k of ENV_KEYS_TO_STUB) vi.stubEnv(k, 'test');
    const { config } = await import('../../lib/config.ts');
    expect(config.openaiTTSPricePerChar).toBe(0.00003);
  });
});
