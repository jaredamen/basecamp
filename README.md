# Basecamp

**Learn anything, your way.** Paste a URL or any text — Basecamp turns it into flashcards and expert audio lessons.

Live at **[basecamp-pink.vercel.app](https://basecamp-pink.vercel.app)**.

## What it does

Give Basecamp a Wikipedia article, a research paper, a blog post, documentation, or any text. It will:

- Extract the key ideas and generate **8-15 flashcards** for active recall
- Write an **expert audio lesson** that teaches through analogies and stories
- Let you study the cards and listen to the audio anywhere

It works with anything — philosophy, history, technical docs, science, anime, whatever you're curious about.

## How it works

Two ways to use it:

**Managed (recommended):** Sign in with Google. You get a small free allowance to try it, then add a card and pay for what you use (about $0.10 per lesson). No API keys required.

**BYOK (bring your own keys):** Use your own OpenAI, Anthropic, or Google AI key. Pay providers directly with no markup. Your keys are held in memory only, never stored.

## Architecture

- **Frontend:** React 19 + Vite + Tailwind, as a Progressive Web App
- **Backend:** Vercel serverless functions in `api/`
- **Database:** Neon Postgres (free tier)
- **Auth:** Google OAuth with JWT cookies
- **AI:** OpenAI (for managed users) — flashcards via GPT-4o, audio via tts-1
- **Billing:** Stripe metered billing with 2x markup on OpenAI costs
- **Deployed:** Vercel (auto-deploys from `main`)

## Development

```bash
# Install
npm install

# Run locally — needs Vercel CLI for the /api/ backend
vercel dev          # port 3000 (backend)
npm run dev         # port 5173 (frontend, proxies /api to :3000)

# Build
npm run build

# Test
npm test                    # unit + integration tests
npm run e2e                 # Playwright E2E tests

# Type check + lint
npm run type-check
npm run lint
```

See `.env.example` for required environment variables.

## Project structure

```
api/                  Vercel serverless functions
├── auth/             Google OAuth endpoints
├── billing/          Billing status
├── db/               One-time migration
├── proxy/            AI proxy (chat, tts, URL fetcher)
└── stripe/           Checkout + webhook

lib/                  Shared server-side utilities
├── auth.ts           JWT + cookies
├── billing.ts        Metered usage reporting
├── config.ts         Env var config
├── credits.ts        Cost calculation (legacy; metered billing uses billing.ts)
├── db.ts             Neon connection + migrations
├── governancePrompt.ts   LLM compliance system prompt
├── openai.ts         OpenAI API wrapper
└── ratelimit.ts      Per-user rate limiting

src/                  React frontend
├── components/       UI components
├── hooks/            React hooks (useManaged, useBYOK, etc.)
├── services/         Frontend services (managedAuth, aiPrompting, etc.)
└── ...
```

## Safeguards

- **$5/month** per-user spending cap
- **$10/month** OpenAI account hard limit (set in OpenAI dashboard)
- **Rate limiting**: 10 requests/minute, 100/hour, 50k tokens/24h per user
- **60-second timeout** on every LLM call
- **Server-side `max_tokens` cap** of 3000 tokens
- **LLM governance prompt** on every AI call (prompt injection defense, bulk refusal)
- **BYOK keys never persisted** — in-memory only, cleared on page reload
- **Stripe handles all payments** — cards are never touched by the app

## CI / Deployment

- PRs to `main` run CI: type-check, lint, unit tests, build
- Vercel auto-deploys `main` to production
- Vercel also creates preview deployments for each PR

## Author

**Built by Jared (Yusef) Amen**

- GitHub: [@jaredamen](https://github.com/jaredamen)
- Portfolio: [jaredamen.github.io](https://jaredamen.github.io)
- Support: [Buy Me a Coffee](https://buymeacoffee.com/jaredamen)
