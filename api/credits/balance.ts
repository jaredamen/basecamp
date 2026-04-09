import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { getBalance } from '../_lib/credits';

// GET /api/credits/balance — returns the user's current credit balance
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const balance = await getBalance(user.id);
    return res.status(200).json({ creditBalanceCents: balance });
  } catch (err) {
    console.error('Error fetching balance:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
