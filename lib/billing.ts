import Stripe from 'stripe';
import { config } from './config.js';
import { getDb } from './db.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = new (Stripe as any)(config.stripe.secretKey);

export interface BillingStatus {
  canGenerate: boolean;
  reason?: 'no_payment_method' | 'spend_cap_reached';
  freeRemainingCents: number;
  hasPaymentMethod: boolean;
  currentMonthUsageCents: number;
}

/**
 * Check if a user can make a generation request.
 * They can if they have free allowance remaining OR an active subscription
 * below the monthly spend cap.
 */
export async function checkBillingStatus(userId: string): Promise<BillingStatus> {
  const sql = getDb();

  // Get user's billing info
  const rows = await sql`
    SELECT free_usage_cents, stripe_customer_id, stripe_subscription_id
    FROM users WHERE id = ${userId}
  `;

  if (rows.length === 0) {
    return {
      canGenerate: false,
      reason: 'no_payment_method',
      freeRemainingCents: 0,
      hasPaymentMethod: false,
      currentMonthUsageCents: 0,
    };
  }

  const user = rows[0];
  const freeUsedCents: number = user.free_usage_cents ?? 0;
  const freeRemainingCents = Math.max(0, config.freeAllowanceCents - freeUsedCents);
  const hasPaymentMethod = !!user.stripe_subscription_id;

  // Calculate current month's metered usage from credit_transactions
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const usageRows = await sql`
    SELECT COALESCE(SUM(ABS(amount_cents)), 0) AS total_cents
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND type = 'metered'
      AND created_at >= ${monthStart}::timestamptz
  `;
  const currentMonthUsageCents: number = Number(usageRows[0]?.total_cents ?? 0);

  // User can generate if they have free allowance left
  if (freeRemainingCents > 0) {
    return {
      canGenerate: true,
      freeRemainingCents,
      hasPaymentMethod,
      currentMonthUsageCents,
    };
  }

  // No free allowance left — need a payment method
  if (!hasPaymentMethod) {
    return {
      canGenerate: false,
      reason: 'no_payment_method',
      freeRemainingCents: 0,
      hasPaymentMethod: false,
      currentMonthUsageCents,
    };
  }

  // Has payment method — check spend cap
  if (currentMonthUsageCents >= config.monthlySpendCapCents) {
    return {
      canGenerate: false,
      reason: 'spend_cap_reached',
      freeRemainingCents: 0,
      hasPaymentMethod: true,
      currentMonthUsageCents,
    };
  }

  return {
    canGenerate: true,
    freeRemainingCents: 0,
    hasPaymentMethod: true,
    currentMonthUsageCents,
  };
}

/**
 * Report usage after a successful AI call.
 * Uses free allowance first, then reports to Stripe meter for metered billing.
 */
export async function reportUsage(
  userId: string,
  costCents: number,
  description: string
): Promise<void> {
  const sql = getDb();

  // Get user's current free usage and stripe customer id
  const rows = await sql`
    SELECT free_usage_cents, stripe_customer_id, stripe_subscription_id
    FROM users WHERE id = ${userId}
  `;

  if (rows.length === 0) return;

  const user = rows[0];
  const freeUsedCents: number = user.free_usage_cents ?? 0;
  const freeRemainingCents = Math.max(0, config.freeAllowanceCents - freeUsedCents);

  if (freeRemainingCents > 0) {
    // Absorb as much as possible from the free allowance
    const freeDeduction = Math.min(costCents, freeRemainingCents);
    const meteredOverflow = costCents - freeDeduction;

    // Update free usage counter
    await sql`
      UPDATE users
      SET free_usage_cents = free_usage_cents + ${freeDeduction},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    // Log the free portion as a transaction
    await sql`
      INSERT INTO credit_transactions (user_id, type, amount_cents, balance_after_cents, description)
      VALUES (${userId}, 'usage', ${-freeDeduction}, ${0}, ${`[free] ${description}`})
    `;

    // If there's overflow beyond the free tier, report that to Stripe
    if (meteredOverflow > 0 && user.stripe_customer_id) {
      await reportToStripeMeter(userId, user.stripe_customer_id, meteredOverflow, description);
    }
  } else if (user.stripe_customer_id) {
    // No free allowance left — full amount goes to Stripe meter
    await reportToStripeMeter(userId, user.stripe_customer_id, costCents, description);
  }
}

/**
 * Report usage to the Stripe Billing Meter and log a transaction.
 */
async function reportToStripeMeter(
  userId: string,
  stripeCustomerId: string,
  costCents: number,
  description: string
): Promise<void> {
  const sql = getDb();

  // Report to Stripe meter
  await stripe.billing.meterEvents.create({
    event_name: config.stripe.meterEventName,
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(costCents),
    },
  });

  // Log the metered transaction
  await sql`
    INSERT INTO credit_transactions (user_id, type, amount_cents, balance_after_cents, description)
    VALUES (${userId}, 'metered', ${-costCents}, ${0}, ${description})
  `;
}

/**
 * Get or create a Stripe customer for the user.
 * Stores the customer ID on the user row for future lookups.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const sql = getDb();

  // Check if user already has a Stripe customer ID
  const rows = await sql`
    SELECT stripe_customer_id FROM users WHERE id = ${userId}
  `;

  if (rows.length > 0 && rows[0].stripe_customer_id) {
    return rows[0].stripe_customer_id;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { basecamp_user_id: userId },
  });

  // Save the customer ID
  await sql`
    UPDATE users
    SET stripe_customer_id = ${customer.id}, updated_at = NOW()
    WHERE id = ${userId}
  `;

  return customer.id;
}

/**
 * Create a metered subscription for a customer after they add a payment method.
 * Returns the subscription ID.
 */
export async function createMeteredSubscription(
  stripeCustomerId: string
): Promise<string> {
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [
      {
        price: config.stripe.meteredPriceId,
      },
    ],
  });

  return subscription.id;
}
