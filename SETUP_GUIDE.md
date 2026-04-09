# Basecamp Managed Tier — Setup Guide

Follow these steps in order. Each step depends on the previous one.

---

## 1. Install Vercel CLI

```bash
npm i -g vercel
```

Then link your project:

```bash
cd /path/to/basecamp
vercel link
```

Follow the prompts to connect to your Vercel account and project.

---

## 2. Set Up Neon Postgres (Database)

1. Go to **https://vercel.com/dashboard** → your Basecamp project → **Storage** tab
2. Click **Connect Store** → **Neon Postgres** → **Create New**
3. Name it something like `basecamp-db`, pick a region close to you
4. Click **Create & Connect**
5. Vercel auto-sets the `POSTGRES_URL` environment variable for you

**Run the migration** (creates the tables):

After deploying once (or using `vercel dev`), hit this endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/db/migrate
```

You should get `{"success":true,"message":"Migrations complete"}`.

---

## 3. Set Up Google OAuth

1. Go to **https://console.cloud.google.com/apis/credentials**
2. Create a project (or select an existing one)
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External**
   - App name: `Basecamp`
   - Support email: your email
   - Authorized domains: add `vercel.app` (and your custom domain if you have one)
   - Click **Save and Continue** through the rest (scopes and test users can be left default)
5. Back on Credentials → **+ CREATE CREDENTIALS** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Basecamp`
   - **Authorized redirect URIs**: Add these:
     - `https://your-app.vercel.app/api/auth/callback` (production)
     - `http://localhost:3000/api/auth/callback` (local dev)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

---

## 4. Set Up Stripe

You said you already have a Stripe account. Here's what to do:

### Get your API keys
1. Go to **https://dashboard.stripe.com/apikeys**
2. Copy the **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for production)

### Create the webhook endpoint
1. Go to **https://dashboard.stripe.com/webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events: check **`checkout.session.completed`**
5. Click **Add endpoint**
6. On the webhook detail page, click **Reveal** under Signing secret
7. Copy the webhook secret (starts with `whsec_`)

**For local testing** (optional):
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
The CLI will show a local webhook secret — use that in `.env.local`.

---

## 5. Generate JWT Secret

Run this in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output — this is your `JWT_SECRET`.

---

## 6. Set All Environment Variables

### On Vercel (production)

Go to **https://vercel.com/dashboard** → your project → **Settings** → **Environment Variables**

Add each of these (for all environments: Production, Preview, Development):

| Variable | Value | Where to get it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Step 3 |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Step 3 |
| `GOOGLE_REDIRECT_URI` | `https://your-app.vercel.app/api/auth/callback` | Your Vercel URL + path |
| `JWT_SECRET` | (base64 string) | Step 5 |
| `OPENAI_API_KEY` | `sk-proj-xxxxx` | Your OpenAI key |
| `STRIPE_SECRET_KEY` | `sk_live_xxxxx` (or `sk_test_` for testing) | Step 4 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Step 4 |
| `POSTGRES_URL` | (auto-set by Neon) | Step 2 — already done |

### For local development

Pull env vars from Vercel:

```bash
vercel env pull .env.local
```

Or manually create `.env.local` by copying `.env.example` and filling in the values.

---

## 7. Deploy and Run Migration

```bash
# Deploy
vercel --prod

# Run database migration (one-time)
curl -X POST https://your-app.vercel.app/api/db/migrate
```

---

## 8. Test the Full Flow

1. Open your app URL
2. Click **"Handle it for me"**
3. Click **"Sign in with Google"** → should redirect to Google → back to your app
4. Click **"Add Credits"** → pick $3 → should redirect to Stripe Checkout
5. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
6. After payment, you should see your credit balance
7. Click **"Start Learning"** → paste a URL or text → generate content
8. Check that credits are deducted after generation

---

## 9. Go Live Checklist

- [ ] Switch Stripe from test mode to live mode (swap `sk_test_` for `sk_live_` key)
- [ ] Create a **live** webhook endpoint on Stripe dashboard (same URL, new secret)
- [ ] Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on Vercel
- [ ] Make sure `GOOGLE_REDIRECT_URI` points to your production domain
- [ ] Publish your Google OAuth consent screen (move out of "Testing" mode)
- [ ] Test the full flow one more time with a real card

---

## Local Development

```bash
# Pull env vars
vercel env pull .env.local

# Run locally (serves both SPA and API functions)
vercel dev
```

This starts the app at `http://localhost:3000` with both the Vite SPA and serverless functions running.
