import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../_lib/config';
import { signToken, setAuthCookie, upsertGoogleUser } from '../_lib/auth';

// GET /api/auth/callback — Google OAuth callback
// Exchanges the authorization code for tokens, fetches profile, upserts user, sets JWT cookie.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(302, `${config.appUrl}/?auth=error`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return res.redirect(302, `${config.appUrl}/?auth=error`);
    }

    const tokens = await tokenRes.json();

    // Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      console.error('Profile fetch failed:', await profileRes.text());
      return res.redirect(302, `${config.appUrl}/?auth=error`);
    }

    const profile = await profileRes.json();

    if (!profile.id || !profile.email) {
      console.error('Incomplete Google profile response:', JSON.stringify(profile));
      return res.redirect(302, `${config.appUrl}/?auth=error`);
    }

    // Upsert user in database
    const user = await upsertGoogleUser({
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    // Sign JWT and set cookie
    const token = await signToken({
      sub: user.id,
      email: user.email,
    });

    setAuthCookie(res, token);

    // Redirect back to the app
    res.redirect(302, `${config.appUrl}/?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(302, `${config.appUrl}/?auth=error`);
  }
}
