# Runbook

## Rollback procedure

Basecamp auto-deploys from `main` via Vercel. If a deploy breaks production:

### Quick rollback (< 1 minute)
1. Go to **Vercel dashboard → basecamp → Deployments**
2. Find the last working deployment (green checkmark)
3. Click the `...` menu → **Promote to Production**
4. Production instantly serves the old deployment

### Code rollback
```bash
# Find the last good commit
git log --oneline main -10

# Revert the bad commit
git revert <bad-commit-sha>
git push origin main

# Vercel auto-deploys the revert
```

### Nuclear option (if Vercel is down)
The app is 100% on Vercel — if Vercel is down, we're down. No action possible until Vercel recovers. Check status.vercel.com.

## Health check

```bash
# DB connectivity
curl https://basecamp-pink.vercel.app/api/db/migrate

# Auth endpoint
curl https://basecamp-pink.vercel.app/api/auth/me
# Expected: {"error":"Not authenticated"} (200-level is fine, means the function runs)
```

## Common issues

### "Session budget exceeded" error
User has exceeded 500k tokens in 24 hours. Wait 24 hours or clear `llm_requests` table rows for that user.

### OpenAI API errors
Check OpenAI status at status.openai.com. Also verify:
- `OPENAI_API_KEY` env var is set in Vercel
- OpenAI account has balance ($10 budget)
- OpenAI account isn't rate-limited (Usage tier 1 = 500 RPM)

### Stripe webhook not firing
- Verify webhook endpoint in Stripe dashboard: `https://basecamp-pink.vercel.app/api/stripe/webhook`
- Check `STRIPE_WEBHOOK_SECRET` env var matches the signing secret in Stripe
- Check Vercel function logs for webhook errors

### Auth redirect goes to wrong URL
- `VERCEL_PROJECT_PRODUCTION_URL` should auto-resolve to `basecamp-pink.vercel.app`
- If not, set `APP_URL=https://basecamp-pink.vercel.app` in Vercel env vars

## Secret rotation

| Secret | Location | Rotation |
|--------|----------|----------|
| `JWT_SECRET` | Vercel env vars | Rotate manually, invalidates all sessions |
| `OPENAI_API_KEY` | Vercel env vars + OpenAI dashboard | Rotate in OpenAI, update Vercel, redeploy |
| `GOOGLE_CLIENT_SECRET` | Vercel env vars + Google Cloud Console | Rotate in GCP, update Vercel, redeploy |
| `STRIPE_SECRET_KEY` | Vercel env vars + Stripe dashboard | Roll key in Stripe, update Vercel, redeploy |
| `STRIPE_WEBHOOK_SECRET` | Vercel env vars + Stripe webhook page | Delete + recreate webhook, update Vercel |
| `POSTGRES_URL` | Vercel env vars (auto-set by Neon integration) | Rotate in Neon dashboard if compromised |
