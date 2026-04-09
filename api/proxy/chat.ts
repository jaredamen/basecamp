import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { chatCompletion } from '../_lib/openai';
import { calculateChatCostCents, deductCredits, getBalance } from '../_lib/credits';

// POST /api/proxy/chat — proxied OpenAI chat completion with credit deduction
// Body: { messages, temperature?, max_tokens?, response_format? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  // Quick balance check
  const balance = await getBalance(user.id);
  if (balance < 1) {
    return res.status(402).json({
      error: 'insufficient_credits',
      balance,
      message: 'You need more credits to continue. Top up to keep learning!',
    });
  }

  const { messages, temperature, max_tokens, response_format } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    // Call OpenAI
    const result = await chatCompletion({
      messages,
      temperature,
      max_tokens,
      response_format,
    });

    // Calculate actual cost from usage
    const usage = result.usage;
    const costCents = calculateChatCostCents({
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      model: result.model,
    });

    // Deduct credits
    const deduction = await deductCredits(user.id, costCents, `Chat: ${result.model}`, {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      model: result.model,
      cost_cents: costCents,
    });

    // If deduction fails (race condition — balance dropped between check and deduct),
    // still return the result but warn. Don't punish the user for a race condition.
    const remainingBalance = deduction?.newBalance ?? balance - costCents;

    res.setHeader('X-Credits-Remaining', String(remainingBalance));
    return res.status(200).json(result);
  } catch (err) {
    console.error('Proxy chat error:', err);
    return res.status(502).json({
      error: 'AI service error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
