import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { config as appConfig } from '../_lib/config';
import { addCredits } from '../_lib/credits';
import { getDb } from '../_lib/db';

const stripe = new (Stripe as any)(appConfig.stripe.secretKey) as Stripe;

// Disable Vercel's default body parsing — Stripe needs the raw body for signature verification.
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// POST /api/stripe/webhook — handles Stripe webhook events
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: any;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig as string,
      appConfig.stripe.webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Idempotency check — don't process the same event twice
  const sql = getDb();
  const existing = await sql`
    SELECT id FROM stripe_events WHERE id = ${event.id}
  `;
  if (existing.length > 0) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.user_id;
    const tierCents = parseInt(session.metadata?.tier_cents || '0', 10);

    if (!userId || !tierCents) {
      console.error('Missing metadata on checkout session:', session.id);
      return res.status(400).json({ error: 'Missing metadata' });
    }

    // Record event for idempotency
    await sql`
      INSERT INTO stripe_events (id, type) VALUES (${event.id}, ${event.type})
    `;

    // Add credits to user
    await addCredits(userId, tierCents, session.id);

    console.log(`Credits added: ${tierCents} cents for user ${userId}`);
  }

  return res.status(200).json({ received: true });
}
