import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signToken, setAuthCookie, upsertGoogleUser } from '../lib/auth';

// POST /api/auth/dev-login — Development-only endpoint.
// Creates a fake user and sets the JWT cookie so you can test
// the full authenticated flow without real Google OAuth credentials.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    email = 'dev@test.local',
    name = 'Dev User',
    googleId = 'dev-google-id-12345',
  } = req.body || {};

  try {
    const user = await upsertGoogleUser({
      googleId,
      email,
      name,
      avatarUrl: undefined,
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
    });

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Dev login error:', err);
    return res.status(500).json({ error: 'Dev login failed', message: String(err) });
  }
}
