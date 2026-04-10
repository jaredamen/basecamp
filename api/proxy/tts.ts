import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';
import { textToSpeech } from '../../lib/openai.js';
import { calculateTTSCostCents, deductCredits, refundCredits } from '../../lib/credits.js';
import { checkRateLimit, recordLLMRequest } from '../../lib/ratelimit.js';

// POST /api/proxy/tts — proxied OpenAI TTS with credit pre-deduction
// Body: { text, voice?, speed? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  // Rate limit check
  const rateCheck = await checkRateLimit(user.id);
  if (!rateCheck.ok) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds ?? 60));
    return res.status(429).json({
      error: rateCheck.reason,
      message: rateCheck.message,
    });
  }

  const { text, voice, speed } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  if (text.length > 4096) {
    return res.status(400).json({ error: 'Text too long (max 4096 characters)' });
  }

  // Pre-calculate cost (character count is known)
  const costCents = calculateTTSCostCents(text.length);

  // Pre-deduct credits
  const deduction = await deductCredits(user.id, costCents, `TTS: ${text.length} chars`);
  if (!deduction) {
    return res.status(402).json({
      error: 'insufficient_credits',
      balance: 0,
      message: 'You need more credits to generate audio. Top up to keep learning!',
    });
  }

  try {
    const audioBuffer = await textToSpeech({ text, voice, speed });

    // Record the request — for TTS we use char count as a token-equivalent proxy
    await recordLLMRequest(user.id, 'tts', text.length);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Credits-Remaining', String(deduction.newBalance));
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    // Refund on failure
    console.error('Proxy TTS error:', err);
    await refundCredits(user.id, costCents, 'TTS generation failed — refunded');

    return res.status(502).json({
      error: 'TTS service error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
