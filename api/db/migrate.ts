import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, runMigrations } from '../../lib/db.js';

// GET  /api/db/migrate — health check (verifies DB connectivity)
// POST /api/db/migrate — run database migrations
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET = health check
  if (req.method === 'GET') {
    try {
      const sql = getDb();
      await sql`SELECT 1`;
      return res.status(200).json({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        db: 'disconnected',
        error: String(error),
      });
    }
  }

  // POST = run migrations
  if (req.method === 'POST') {
    try {
      await runMigrations();
      return res.status(200).json({ success: true, message: 'Migrations complete' });
    } catch (error) {
      console.error('Migration failed:', error);
      return res.status(500).json({ error: 'Migration failed', details: String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
