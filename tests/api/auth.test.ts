// @vitest-environment node

import { webcrypto } from 'node:crypto';

// jose uses the Web Crypto API — polyfill for Node <20 test environments
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

import { describe, it, expect, vi, beforeAll } from 'vitest';

// Stub env vars before any imports that read config
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-must-be-at-least-32-chars-long');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-client-secret');
vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/auth/callback');

// Mock the database module so auth.ts can be imported without a real DB
vi.mock('../../lib/db', () => ({
  getDb: vi.fn(),
}));

import {
  signToken,
  verifyToken,
  getAuthUser,
  requireAuth,
  setAuthCookie,
  clearAuthCookie,
  withAuth,
} from '../../lib/auth';
import { config } from '../../lib/config';

function mockReq(cookie?: string): any {
  return { headers: { cookie: cookie || '' } };
}

function mockRes(): any {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: null as any,
    status(code: number) { res.statusCode = code; return res; },
    json(data: any) { res.body = data; return res; },
    setHeader(name: string, value: string) { res.headers[name] = value; },
  };
  return res;
}

describe('signToken / verifyToken', () => {
  it('round-trips a payload', async () => {
    const payload = { sub: 'user-123', email: 'test@example.com' };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe('user-123');
    expect(decoded!.email).toBe('test@example.com');
  });

  it('returns null for an invalid token', async () => {
    const result = await verifyToken('not-a-real-token');
    expect(result).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const token = await signToken({ sub: 'user-1', email: 'a@b.com' });
    // Flip a character in the signature portion
    const tampered = token.slice(0, -2) + 'xx';
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });
});

describe('getAuthUser', () => {
  it('returns user from a valid cookie', async () => {
    const token = await signToken({ sub: 'user-456', email: 'user@test.com' });
    const req = mockReq(`${config.jwt.cookieName}=${token}`);
    const user = await getAuthUser(req);

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-456');
    expect(user!.email).toBe('user@test.com');
  });

  it('returns null when no cookie is present', async () => {
    const user = await getAuthUser(mockReq());
    expect(user).toBeNull();
  });

  it('returns null when cookie has invalid token', async () => {
    const req = mockReq(`${config.jwt.cookieName}=garbage-token`);
    const user = await getAuthUser(req);
    expect(user).toBeNull();
  });

  it('ignores other cookies and finds the auth cookie', async () => {
    const token = await signToken({ sub: 'user-789', email: 'multi@test.com' });
    const req = mockReq(`other=abc; ${config.jwt.cookieName}=${token}; another=xyz`);
    const user = await getAuthUser(req);

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-789');
  });
});

describe('requireAuth', () => {
  it('returns user when authenticated', async () => {
    const token = await signToken({ sub: 'user-ok', email: 'ok@test.com' });
    const req = mockReq(`${config.jwt.cookieName}=${token}`);
    const res = mockRes();

    const user = await requireAuth(req, res);

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-ok');
    expect(res.statusCode).toBe(0); // res.status() was NOT called
  });

  it('sends 401 and returns null when not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();

    const user = await requireAuth(req, res);

    expect(user).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
  });
});

describe('withAuth', () => {
  it('calls the handler with the authenticated user', async () => {
    const token = await signToken({ sub: 'user-wa', email: 'wa@test.com' });
    const req = mockReq(`${config.jwt.cookieName}=${token}`);
    const res = mockRes();

    let receivedUser: any = null;
    const handler = withAuth(async (_req, _res, user) => {
      receivedUser = user;
    });

    await handler(req, res);

    expect(receivedUser).not.toBeNull();
    expect(receivedUser.id).toBe('user-wa');
    expect(res.statusCode).toBe(0); // no 401
  });

  it('returns 401 without calling the handler when not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    let handlerCalled = false;

    const handler = withAuth(async () => {
      handlerCalled = true;
    });

    await handler(req, res);

    expect(handlerCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe('setAuthCookie', () => {
  it('sets an HttpOnly SameSite=Lax cookie with correct Max-Age', () => {
    const res = mockRes();
    setAuthCookie(res, 'test-token-value');

    const cookie = res.headers['Set-Cookie'] as string;
    expect(cookie).toContain(`${config.jwt.cookieName}=test-token-value`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
  });

  it('does not include Secure flag in non-production', () => {
    const res = mockRes();
    setAuthCookie(res, 'token');
    const cookie = res.headers['Set-Cookie'] as string;
    expect(cookie).not.toContain('Secure');
  });
});

describe('clearAuthCookie', () => {
  it('sets Max-Age=0 to clear the cookie', () => {
    const res = mockRes();
    clearAuthCookie(res);

    const cookie = res.headers['Set-Cookie'] as string;
    expect(cookie).toContain(`${config.jwt.cookieName}=`);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
  });
});
