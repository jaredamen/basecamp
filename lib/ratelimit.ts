import { getDb } from './db.js';
import { SESSION_BUDGET_TOKENS } from './governancePrompt.js';

// Rate limiting configuration — conservative defaults per llm_compliance/CHECKLIST.md
export const RATE_LIMITS = {
  perMinute: 10,
  perHour: 100,
  // Session budget is enforced over a rolling 24h window since we don't have
  // a separate "session id" — JWT lasts 30 days. 24h is a reasonable window.
  sessionWindowHours: 24,
  sessionBudgetTokens: SESSION_BUDGET_TOKENS,
};

export interface RateLimitResult {
  ok: boolean;
  reason?: 'rate_minute' | 'rate_hour' | 'session_budget';
  retryAfterSeconds?: number;
  message?: string;
}

// Check if user is allowed to make another LLM request right now.
// Returns ok:true if under all limits, otherwise the reason for rejection.
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const sql = getDb();

  // Pull request counts for the last hour and last minute, plus session token spend (24h window)
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute') AS minute_count,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS hour_count,
      COALESCE(SUM(tokens_used) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) AS session_tokens
    FROM llm_requests
    WHERE user_id = ${userId}
  `;

  const row = rows[0] || { minute_count: 0, hour_count: 0, session_tokens: 0 };
  const minuteCount = Number(row.minute_count);
  const hourCount = Number(row.hour_count);
  const sessionTokens = Number(row.session_tokens);

  if (minuteCount >= RATE_LIMITS.perMinute) {
    return {
      ok: false,
      reason: 'rate_minute',
      retryAfterSeconds: 60,
      message: `Rate limit: ${RATE_LIMITS.perMinute} requests per minute. Slow down and try again in a minute.`,
    };
  }

  if (hourCount >= RATE_LIMITS.perHour) {
    return {
      ok: false,
      reason: 'rate_hour',
      retryAfterSeconds: 3600,
      message: `Rate limit: ${RATE_LIMITS.perHour} requests per hour exceeded. Try again later.`,
    };
  }

  if (sessionTokens >= RATE_LIMITS.sessionBudgetTokens) {
    return {
      ok: false,
      reason: 'session_budget',
      retryAfterSeconds: RATE_LIMITS.sessionWindowHours * 3600,
      message: `Session budget exceeded (${RATE_LIMITS.sessionBudgetTokens.toLocaleString()} tokens). Try again tomorrow.`,
    };
  }

  return { ok: true };
}

// Record a request for rate limiting purposes. Call after a successful LLM call.
// tokensUsed should be (prompt_tokens + completion_tokens).
export async function recordLLMRequest(
  userId: string,
  endpoint: string,
  tokensUsed: number
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO llm_requests (user_id, endpoint, tokens_used)
    VALUES (${userId}, ${endpoint}, ${tokensUsed})
  `;
}
