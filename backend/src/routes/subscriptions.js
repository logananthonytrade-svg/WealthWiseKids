const express = require('express');
const router  = express.Router();
const Stripe  = require('stripe');
const { supabase } = require('../server');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Price ID map — values are injected via Railway environment variables
const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly:  process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  family_monthly:  process.env.STRIPE_PRICE_FAMILY_MONTHLY,
  family_yearly:   process.env.STRIPE_PRICE_FAMILY_YEARLY,
};

/**
 * POST /subscriptions/create-checkout
 * Creates a Stripe Checkout session and returns the URL to redirect to.
 * Body: { user_id, plan: 'premium'|'family', interval: 'monthly'|'yearly', success_url, cancel_url }
 * Returns: { url: string }
 */
router.post('/create-checkout', async (req, res) => {
  const { user_id, plan, interval, success_url, cancel_url } = req.body;

  if (!user_id || !plan || !interval) {
    return res.status(400).json({ error: 'user_id, plan, and interval are required.' });
  }

  const priceKey = `${plan}_${interval}`;
  const priceId  = PRICE_IDS[priceKey];

  if (!priceId) {
    return res.status(400).json({ error: `Unknown plan/interval combination: ${priceKey}` });
  }

  // Fetch or create a Stripe customer ID for this user
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user_id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    // Look up the user's email from Supabase Auth
    const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { supabase_user_id: user_id },
    });
    customerId = customer.id;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url ?? `${process.env.APP_URL ?? 'https://wealthwisekids.app'}/success`,
      cancel_url: cancel_url ?? `${process.env.APP_URL ?? 'https://wealthwisekids.app'}/cancel`,
      metadata: { user_id },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

/**
 * POST /subscriptions/webhook
 * Stripe sends signed webhook events here.
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 * Note: Must use raw body — configured in server.js before json middleware
 */
router.post('/webhook', async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature invalid.' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.user_id;
        if (!userId) break;

        // Determine plan from price lookup
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        const priceId   = stripeSub.items.data[0]?.price.id;
        let planType    = 'premium';
        if (priceId === PRICE_IDS.family_monthly || priceId === PRICE_IDS.family_yearly) {
          planType = 'family';
        }

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan_type: planType,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: 'active',
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', stripeSub.id)
          .maybeSingle();

        if (existing) {
          await supabase.from('subscriptions').update({
            status: stripeSub.status === 'active' ? 'active' : stripeSub.status,
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', stripeSub.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        await supabase.from('subscriptions').update({
          plan_type: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', stripeSub.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', invoice.subscription);
        break;
      }

      default:
        // Unhandled event type — ignore safely
        break;
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }

  res.json({ received: true });
});

/**
 * GET /subscriptions/status/:user_id
 * Returns the current subscription plan and status for a user.
 * Returns: { plan: 'free'|'premium'|'family', status: string, current_period_end: string|null }
 */
router.get('/status/:user_id', async (req, res) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_type, status, current_period_end')
    .eq('user_id', req.params.user_id)
    .maybeSingle();

  if (!data) {
    // No subscription row yet → treat as free
    return res.json({ plan: 'free', status: 'active', current_period_end: null });
  }

  const isActive = data.status === 'active' &&
    (data.current_period_end === null || new Date(data.current_period_end) > new Date());

  res.json({
    plan: isActive ? data.plan_type : 'free',
    status: data.status,
    current_period_end: data.current_period_end,
  });
});

/**
 * POST /subscriptions/portal
 * Returns a Stripe Customer Portal URL so the user can manage billing.
 * Body: { user_id, return_url }
 */
router.post('/portal', async (req, res) => {
  const { user_id, return_url } = req.body;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer found for this user.' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: return_url ?? 'https://wealthwisekids.app',
  });

  res.json({ url: session.url });
});

module.exports = router;

