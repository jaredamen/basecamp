import { SignJWT, jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from './config';
import { getDb } from './db';

export interface JWTPayload {
  sub: string;   // user.id
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

const getSecret = () => new TextEncoder().encode(config.jwt.secret);

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${config.jwt.expiryDays}d`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Extract and validate the authenticated user from the request cookie.
// Returns null if not authenticated.
export async function getAuthUser(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${config.jwt.cookieName}=([^;]+)`));
  if (!match) return null;

  const payload = await verifyToken(match[1]);
  if (!payload) return null;

  return { id: payload.sub, email: payload.email };
}

// Helper: require auth or return 401
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthenticatedUser | null> {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
}

// Wrap a handler that requires authentication.
// Extracts the user or returns 401 — no null-check needed in the handler.
export function withAuth(
  handler: (req: VercelRequest, res: VercelResponse, user: AuthenticatedUser) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return handler(req, res, user);
  };
}

// Set the auth cookie on the response
export function setAuthCookie(res: VercelResponse, token: string) {
  const maxAge = config.jwt.expiryDays * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `${config.jwt.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
  );
}

// Clear the auth cookie
export function clearAuthCookie(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    `${config.jwt.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

// Upsert user from Google profile, returns the user row
export async function upsertGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO users (google_id, email, name, avatar_url)
    VALUES (${profile.googleId}, ${profile.email}, ${profile.name}, ${profile.avatarUrl || null})
    ON CONFLICT (google_id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW()
    RETURNING id, google_id, email, name, avatar_url, credit_balance_cents
  `;
  return rows[0];
}
