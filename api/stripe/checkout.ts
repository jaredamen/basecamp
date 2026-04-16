import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { requireAuth } from '../../lib/auth.js';
import { config } from '../../lib/config.js';
import { getOrCreateStripeCustomer } from '../../lib/billing.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = new (Stripe as any)(config.stripe.secretKey);

// POST /api/stripe/checkout — creates a Stripe Checkout session in setup mode
// Saves a payment method (no charge). The webhook will create the metered subscription.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    // Get or create a Stripe customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email);

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        user_id: user.id,
      },
      success_url: `${config.appUrl}/?billing=success`,
      cancel_url: `${config.appUrl}/?billing=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
