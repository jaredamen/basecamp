import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMigrations } from '../_lib/db';

// POST /api/db/migrate — run once to set up the database schema.
// In production, hit this endpoint once after connecting Vercel Postgres.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMigrations();
    return res.status(200).json({ success: true, message: 'Migrations complete' });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ error: 'Migration failed', details: String(error) });
  }
}
