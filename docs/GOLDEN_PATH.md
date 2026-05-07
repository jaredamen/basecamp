# Golden Path

The single critical user journey. If this breaks, the product is down.

## User goal
Learn something new from a URL or text — get flashcards and an audio lesson.

## Steps
1. Visit `basecamp-pink.vercel.app`
2. Click "Handle it for me" → Continue → Sign in with Google
3. On the input page, paste a URL or text → click "Generate Learning Content"
4. Wait for generation (~15-30 seconds)
5. See generated flashcards + audio script on the content page
6. Study flashcards (flip, next/previous) and listen to audio

## If this path breaks, the product is down.

## Critical endpoints touched
- `GET /api/auth/google` → Google OAuth redirect
- `GET /api/auth/callback` → sets JWT cookie
- `GET /api/auth/me` → session check
- `POST /api/proxy/fetch-url` → server-side URL fetch
- `POST /api/proxy/chat` → OpenAI flashcard + audio generation
- `GET /api/billing/status` → free allowance / billing check

## E2E test location
- **`e2e/08-golden-path.spec.ts`** — full Playwright E2E test: sign in → enter text → generate → view flashcards + audio + navigation (mocked API, runs in CI)
- `tests/services/aiPrompting.test.ts` — parser tests (15 tests covering JSON response variations)
- `tests/api/auth.test.ts` — auth utilities (14 tests)
- `tests/api/callback.test.ts` — OAuth callback (10 tests)
