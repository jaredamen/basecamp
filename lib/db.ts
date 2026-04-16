import { neon } from '@neondatabase/serverless';

// Creates a SQL query function connected to Neon Postgres.
// POSTGRES_URL is auto-set when you connect Neon to your Vercel project.
export function getDb() {
  const sql = neon(process.env.POSTGRES_URL!);
  return sql;
}

// Run this once to initialize the database schema.
// Call POST /api/db/migrate after connecting your database.
export async function runMigrations() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id            TEXT UNIQUE NOT NULL,
      email                TEXT NOT NULL,
      name                 TEXT,
      avatar_url           TEXT,
      credit_balance_cents INTEGER NOT NULL DEFAULT 0,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id              UUID NOT NULL REFERENCES users(id),
      type                 TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund')),
      amount_cents         INTEGER NOT NULL,
      balance_after_cents  INTEGER NOT NULL,
      description          TEXT,
      stripe_session_id    TEXT,
      openai_usage         JSONB,
      created_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      processed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Per-request log used for rate limiting and session token budget enforcement.
  // See lib/ratelimit.ts.
  await sql`
    CREATE TABLE IF NOT EXISTS llm_requests (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id),
      endpoint     TEXT NOT NULL,
      tokens_used  INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON credit_transactions(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_llm_requests_user_created ON llm_requests(user_id, created_at)`;

  // --- Metered billing columns (added to existing users table) ---
  // Each ALTER is wrapped in a DO block so it's safe to re-run.
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
      ) THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
      END IF;
    END $$
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'stripe_subscription_id'
      ) THEN
        ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
      END IF;
    END $$
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'free_usage_cents'
      ) THEN
        ALTER TABLE users ADD COLUMN free_usage_cents INTEGER NOT NULL DEFAULT 0;
      END IF;
    END $$
  `;

  // Allow 'metered' as a transaction type alongside existing types
  await sql`
    DO $$
    BEGIN
      -- Drop the old CHECK constraint and recreate with 'metered' included
      ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
      ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check
        CHECK (type IN ('purchase', 'usage', 'refund', 'metered'));
    EXCEPTION
      WHEN others THEN NULL;
    END $$
  `;
}
