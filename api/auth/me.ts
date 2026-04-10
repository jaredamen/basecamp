import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthUser } from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';

// GET /api/auth/me — returns the current user's profile and credit balance.
// Returns 401 if not authenticated.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, email, name, avatar_url, credit_balance_cents
      FROM users
      WHERE id = ${authUser.id}
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      creditBalanceCents: user.credit_balance_cents,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
