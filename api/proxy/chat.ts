import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';
import { chatCompletion } from '../../lib/openai.js';
import { calculateChatCostCents } from '../../lib/credits.js';
import { checkBillingStatus, reportUsage } from '../../lib/billing.js';
import { MAX_TOKENS } from '../../lib/governancePrompt.js';
import { checkRateLimit, recordLLMRequest } from '../../lib/ratelimit.js';

// POST /api/proxy/chat — proxied OpenAI chat completion with metered billing
// Body: { messages, temperature?, max_tokens?, response_format? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  // Rate limit check (per-user, per-minute, per-hour, session token budget)
  const rateCheck = await checkRateLimit(user.id);
  if (!rateCheck.ok) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds ?? 60));
    return res.status(429).json({
      error: rateCheck.reason,
      message: rateCheck.message,
    });
  }

  // Billing status check
  const billing = await checkBillingStatus(user.id);
  if (!billing.canGenerate) {
    if (billing.reason === 'spend_cap_reached') {
      return res.status(429).json({
        error: 'spend_cap_reached',
        message: 'Monthly spending limit reached',
      });
    }
    return res.status(402).json({
      error: 'no_payment_method',
      message: 'Add a payment method to continue',
    });
  }

  const { messages, temperature, max_tokens, response_format } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Enforce server-side max_tokens ceiling — never trust client input
  const enforcedMaxTokens = Math.min(
    typeof max_tokens === 'number' ? max_tokens : 2000,
    MAX_TOKENS
  );

  // Enforce server-side temperature bounds
  const enforcedTemperature = typeof temperature === 'number'
    ? Math.max(0, Math.min(temperature, 1.5))
    : 0.7;

  try {
    // Call OpenAI (governance prompt + timeout enforced inside chatCompletion)
    const result = await chatCompletion({
      messages,
      temperature: enforcedTemperature,
      max_tokens: enforcedMaxTokens,
      response_format,
    });

    // Calculate actual cost from usage
    const usage = result.usage;
    const costCents = calculateChatCostCents({
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      model: result.model,
    });

    // Report usage (free allowance first, then Stripe meter)
    await reportUsage(user.id, costCents, `Chat: ${result.model}`);

    // Record the request for rate limiting / session budget tracking
    await recordLLMRequest(
      user.id,
      'chat',
      (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0)
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error('Proxy chat error:', err);
    return res.status(502).json({
      error: 'AI service error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
