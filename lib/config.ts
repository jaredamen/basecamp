// Server-side configuration — all values from Vercel environment variables.
// See .env.example for the full list of required variables.
//
// Uses lazy getters so that missing env vars only error when actually accessed,
// preventing e.g. a missing STRIPE_SECRET_KEY from crashing auth endpoints.

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const config = {
  // Google OAuth
  google: {
    get clientId() { return requireEnv('GOOGLE_CLIENT_ID'); },
    get clientSecret() { return requireEnv('GOOGLE_CLIENT_SECRET'); },
    get redirectUri() { return requireEnv('GOOGLE_REDIRECT_URI'); },
  },

  // JWT for session tokens
  jwt: {
    get secret() { return requireEnv('JWT_SECRET'); },
    cookieName: 'bc_token',
    expiryDays: 30,
  },

  // OpenAI — developer's key, used by proxy for managed users
  openai: {
    get apiKey() { return requireEnv('OPENAI_API_KEY'); },
    defaultModel: 'gpt-4o',
    ttsModel: 'tts-1',
    ttsDefaultVoice: 'nova',
  },

  // Stripe payments
  stripe: {
    get secretKey() { return requireEnv('STRIPE_SECRET_KEY'); },
    get webhookSecret() { return requireEnv('STRIPE_WEBHOOK_SECRET'); },
    get meteredPriceId() { return requireEnv('STRIPE_METERED_PRICE_ID'); },
    get meterEventName() { return process.env.STRIPE_METER_EVENT_NAME || 'ai_generation'; },
  },

  // Credit tiers (cents) — legacy, kept for reference
  creditTiers: [300, 500, 1000, 2000] as const,

  // Free allowance for new users (cents) — ~10 generations
  freeAllowanceCents: 50,

  // Monthly spending cap (cents) — safety limit
  monthlySpendCapCents: 500,

  // Markup on OpenAI costs (2.0 = 100% markup)
  costMarkup: 2.0,

  // OpenAI pricing (dollars per token) — update if pricing changes
  openaiPricing: {
    'gpt-4o': { input: 0.0000025, output: 0.000010 },
    'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  } as Record<string, { input: number; output: number }>,

  // OpenAI TTS pricing (dollars per character)
  openaiTTSPricePerChar: 0.000015,

  // App URL for redirects (OAuth callback, Stripe return, etc).
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain (e.g. basecamp-pink.vercel.app).
  // VERCEL_URL is the deployment-specific URL which changes every deploy — don't use for redirects.
  get appUrl(): string {
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:5173';
  },
} as const;
