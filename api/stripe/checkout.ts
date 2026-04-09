import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { requireAuth } from '../lib/auth';
import { config } from '../lib/config';

const stripe = new Stripe(config.stripe.secretKey);

const TIER_LABELS: Record<number, string> = {
  300: '$3.00',
  500: '$5.00',
  1000: '$10.00',
  2000: '$20.00',
};

// POST /api/stripe/checkout — creates a Stripe Checkout session for credit purchase
// Body: { tier: 300 | 500 | 1000 | 2000 }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { tier } = req.body;

  if (!config.creditTiers.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid tier',
      validTiers: config.creditTiers,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tier_cents: String(tier),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: tier,
            product_data: {
              name: `Basecamp Credits — ${TIER_LABELS[tier]}`,
              description: 'Prepaid credits for AI-powered learning content generation',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/?credits=success`,
      cancel_url: `${config.appUrl}/?credits=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
