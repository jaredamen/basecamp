// @vitest-environment node

import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub env vars before config is imported
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-must-be-at-least-32-chars-long');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/auth/callback');
vi.stubEnv('APP_URL', 'http://localhost:5173');

// Mock global fetch for Google API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the database
vi.mock('../../api/_lib/db', () => ({
  getDb: vi.fn(() => {
    // Return a tagged template function that simulates sql``
    const sql = (...args: any[]) => {
      return [
        {
          id: 'user-abc-123',
          google_id: 'google-123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          credit_balance_cents: 0,
        },
      ];
    };
    return sql;
  }),
}));

import handler from '../../api/auth/callback';
import { verifyToken } from '../../api/_lib/auth';
import { config } from '../../api/_lib/config';

function mockReq(query: Record<string, string> = {}): any {
  return { method: 'GET', query };
}

function mockRes(): any {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: null as any,
    redirectUrl: null as string | null,
    status(code: number) { res.statusCode = code; return res; },
    json(data: any) { res.body = data; return res; },
    setHeader(name: string, value: string) { res.headers[name] = value; },
    redirect(status: number, url: string) {
      res.statusCode = status;
      res.redirectUrl = url;
      return res;
    },
  };
  return res;
}

function setupGoogleMocks(overrides?: {
  tokenOk?: boolean;
  profileOk?: boolean;
  profileData?: any;
}) {
  const opts = {
    tokenOk: true,
    profileOk: true,
    profileData: { id: 'google-123', email: 'test@example.com', name: 'Test User', picture: null },
    ...overrides,
  };

  mockFetch.mockImplementation(async (url: string) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      if (!opts.tokenOk) {
        return { ok: false, status: 400, text: async () => '{"error":"invalid_grant"}' };
      }
      return {
        ok: true,
        json: async () => ({ access_token: 'mock-access-token', token_type: 'Bearer' }),
      };
    }
    if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
      if (!opts.profileOk) {
        return { ok: false, status: 401, text: async () => 'Unauthorized' };
      }
      return { ok: true, json: async () => opts.profileData };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /api/auth/callback', () => {
  it('rejects non-GET requests', async () => {
    const req = { method: 'POST', query: {} } as any;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('redirects to error when code is missing', async () => {
    const res = mockRes();
    await handler(mockReq({}), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('redirects to error when error param is present', async () => {
    const res = mockRes();
    await handler(mockReq({ error: 'access_denied' }), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('redirects to error when token exchange fails', async () => {
    setupGoogleMocks({ tokenOk: false });
    const res = mockRes();

    await handler(mockReq({ code: 'valid-code' }), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('redirects to error when profile fetch fails', async () => {
    setupGoogleMocks({ profileOk: false });
    const res = mockRes();

    await handler(mockReq({ code: 'valid-code' }), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('redirects to error when profile is missing id', async () => {
    setupGoogleMocks({ profileData: { email: 'test@example.com', name: 'Test' } });
    const res = mockRes();

    await handler(mockReq({ code: 'valid-code' }), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('redirects to error when profile is missing email', async () => {
    setupGoogleMocks({ profileData: { id: 'google-123', name: 'Test' } });
    const res = mockRes();

    await handler(mockReq({ code: 'valid-code' }), res);

    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=error`);
  });

  it('completes the happy path: exchanges code, sets cookie, redirects to success', async () => {
    setupGoogleMocks();
    const res = mockRes();

    await handler(mockReq({ code: 'valid-auth-code' }), res);

    // Should redirect to success
    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe(`${config.appUrl}/?auth=success`);

    // Should have set a cookie
    const cookie = res.headers['Set-Cookie'] as string;
    expect(cookie).toBeDefined();
    expect(cookie).toContain(config.jwt.cookieName);
    expect(cookie).toContain('HttpOnly');

    // Cookie should contain a valid JWT
    const tokenMatch = cookie.match(new RegExp(`${config.jwt.cookieName}=([^;]+)`));
    expect(tokenMatch).not.toBeNull();

    const payload = await verifyToken(tokenMatch![1]);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('user-abc-123');
    expect(payload!.email).toBe('test@example.com');
  });

  it('sends correct parameters in token exchange request', async () => {
    setupGoogleMocks();
    const res = mockRes();

    await handler(mockReq({ code: 'my-auth-code' }), res);

    // Verify the token exchange call
    const tokenCall = mockFetch.mock.calls.find(
      (call: any) => call[0] === 'https://oauth2.googleapis.com/token'
    );
    expect(tokenCall).toBeDefined();

    const body = tokenCall![1].body as URLSearchParams;
    expect(body.get('code')).toBe('my-auth-code');
    expect(body.get('client_id')).toBe('test-client-id');
    expect(body.get('client_secret')).toBe('test-client-secret');
    expect(body.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback');
    expect(body.get('grant_type')).toBe('authorization_code');
  });

  it('sends access token to userinfo endpoint', async () => {
    setupGoogleMocks();
    const res = mockRes();

    await handler(mockReq({ code: 'some-code' }), res);

    const profileCall = mockFetch.mock.calls.find(
      (call: any) => call[0] === 'https://www.googleapis.com/oauth2/v2/userinfo'
    );
    expect(profileCall).toBeDefined();
    expect(profileCall![1].headers.Authorization).toBe('Bearer mock-access-token');
  });
});
