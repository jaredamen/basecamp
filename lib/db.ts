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

  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON credit_transactions(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
}
