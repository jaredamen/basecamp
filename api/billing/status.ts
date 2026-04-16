import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';
import { checkBillingStatus } from '../../lib/billing.js';

// GET /api/billing/status — returns the user's current billing status
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const status = await checkBillingStatus(user.id);
    return res.status(200).json(status);
  } catch (err) {
    console.error('Error fetching billing status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
