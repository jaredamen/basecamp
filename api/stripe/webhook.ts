import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { config as appConfig } from '../../lib/config.js';
import { getDb } from '../../lib/db.js';
import { createMeteredSubscription } from '../../lib/billing.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = new (Stripe as any)(appConfig.stripe.secretKey);

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

  // Record event for idempotency
  await sql`
    INSERT INTO stripe_events (id, type) VALUES (${event.id}, ${event.type})
  `;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    // Setup mode: card was saved, now create the metered subscription
    if (session.mode === 'setup') {
      const customerId = session.customer as string;
      if (!customerId) {
        console.error('Missing customer on setup session:', session.id);
        return res.status(400).json({ error: 'Missing customer' });
      }

      try {
        const subscriptionId = await createMeteredSubscription(customerId);

        // Save subscription ID to the user row
        await sql`
          UPDATE users
          SET stripe_subscription_id = ${subscriptionId}, updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
        `;

        console.log(`Metered subscription created: ${subscriptionId} for customer ${customerId}`);
      } catch (err) {
        console.error('Failed to create metered subscription:', err);
        return res.status(500).json({ error: 'Failed to create subscription' });
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer as string;
    console.error(
      `Invoice payment failed for customer ${customerId}, invoice ${invoice.id}. ` +
      `Subscription may need attention.`
    );
    // Future: could disable the subscription or notify the user
  }

  return res.status(200).json({ received: true });
}
