import { config } from './config';
import { getDb } from './db';

// Calculate the cost in cents for a chat completion, with markup.
export function calculateChatCostCents(usage: {
  prompt_tokens: number;
  completion_tokens: number;
  model: string;
}): number {
  const pricing = config.openaiPricing[usage.model] || config.openaiPricing['gpt-4o'];
  const costDollars =
    usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output;
  const withMarkup = costDollars * config.costMarkup;
  // Round up to nearest cent, minimum 1 cent per call
  return Math.max(1, Math.ceil(withMarkup * 100));
}

// Calculate the cost in cents for a TTS request, with markup.
export function calculateTTSCostCents(characterCount: number): number {
  const costDollars = characterCount * config.openaiTTSPricePerChar;
  const withMarkup = costDollars * config.costMarkup;
  return Math.max(1, Math.ceil(withMarkup * 100));
}

// Atomically deduct credits from a user's balance.
// Returns the new balance, or null if insufficient credits.
export async function deductCredits(
  userId: string,
  amountCents: number,
  description: string,
  openaiUsage?: Record<string, unknown>
): Promise<{ newBalance: number } | null> {
  const sql = getDb();

  // Atomic deduction with balance check
  const rows = await sql`
    UPDATE users
    SET credit_balance_cents = credit_balance_cents - ${amountCents},
        updated_at = NOW()
    WHERE id = ${userId} AND credit_balance_cents >= ${amountCents}
    RETURNING credit_balance_cents
  `;

  if (rows.length === 0) {
    return null; // Insufficient credits
  }

  const newBalance = rows[0].credit_balance_cents;

  // Log the transaction
  await sql`
    INSERT INTO credit_transactions (user_id, type, amount_cents, balance_after_cents, description, openai_usage)
    VALUES (${userId}, 'usage', ${-amountCents}, ${newBalance}, ${description}, ${JSON.stringify(openaiUsage || null)})
  `;

  return { newBalance };
}

// Add credits to a user's balance (after Stripe payment).
// Returns the new balance.
export async function addCredits(
  userId: string,
  amountCents: number,
  stripeSessionId: string
): Promise<number> {
  const sql = getDb();

  const rows = await sql`
    UPDATE users
    SET credit_balance_cents = credit_balance_cents + ${amountCents},
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING credit_balance_cents
  `;

  const newBalance = rows[0].credit_balance_cents;

  await sql`
    INSERT INTO credit_transactions (user_id, type, amount_cents, balance_after_cents, description, stripe_session_id)
    VALUES (${userId}, 'purchase', ${amountCents}, ${newBalance}, ${`Purchased $${(amountCents / 100).toFixed(2)} credits`}, ${stripeSessionId})
  `;

  return newBalance;
}

// Refund credits (e.g., if an API call fails after pre-deduction).
export async function refundCredits(
  userId: string,
  amountCents: number,
  description: string
): Promise<number> {
  const sql = getDb();

  const rows = await sql`
    UPDATE users
    SET credit_balance_cents = credit_balance_cents + ${amountCents},
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING credit_balance_cents
  `;

  const newBalance = rows[0].credit_balance_cents;

  await sql`
    INSERT INTO credit_transactions (user_id, type, amount_cents, balance_after_cents, description)
    VALUES (${userId}, 'refund', ${amountCents}, ${newBalance}, ${description})
  `;

  return newBalance;
}

// Get user's current balance
export async function getBalance(userId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT credit_balance_cents FROM users WHERE id = ${userId}
  `;
  return rows[0]?.credit_balance_cents ?? 0;
}
