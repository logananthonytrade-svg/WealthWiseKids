const express  = require('express');
const router   = express.Router();
const Stripe   = require('stripe');
const { supabase } = require('../lib/supabaseAdmin');
const { isUUID } = require('../middleware/validate');

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
 * Auth:  Bearer <supabase_jwt>
 * Body: { plan: 'premium'|'family', interval: 'monthly'|'yearly', success_url?, cancel_url? }
 * Returns: { url: string }
 */
router.post('/create-checkout', async (req, res) => {
  // Authenticate — user_id is taken from the verified JWT, not the body
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token provided.' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }

  const { plan, interval, success_url, cancel_url } = req.body;
  const user_id = user.id;

  if (!plan || !interval) {
    return res.status(400).json({ error: 'plan and interval are required.' });
  }
  if (!['premium', 'family'].includes(plan)) {
    return res.status(400).json({ error: 'plan must be premium or family.' });
  }
  if (!['monthly', 'yearly'].includes(interval)) {
    return res.status(400).json({ error: 'interval must be monthly or yearly.' });
  }

  const URL_RE = /^https?:\/\//;
  if (success_url && !URL_RE.test(success_url)) {
    return res.status(400).json({ error: 'success_url must be a valid URL.' });
  }
  if (cancel_url && !URL_RE.test(cancel_url)) {
    return res.status(400).json({ error: 'cancel_url must be a valid URL.' });
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
    console.error('[subscriptions/create-checkout] Stripe error', {
      user_id, plan, interval, error: err.message,
    });
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
    console.error('[subscriptions/webhook] signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Webhook signature invalid.' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.user_id;
        if (!userId) {
          console.error('[subscriptions/webhook] checkout.session.completed missing user_id in metadata', { session_id: session.id });
          break;
        }

        // Guard: only handle subscription-mode checkouts here
        if (!session.subscription) {
          // Payment-mode checkout (e.g. coin packs) — not handled here
          break;
        }

        let stripeSub;
        try {
          stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        } catch (stripeErr) {
          console.error('[subscriptions/webhook] failed to retrieve subscription', {
            subscription_id: session.subscription, error: stripeErr.message,
          });
          break;
        }

        const priceId   = stripeSub.items.data[0]?.price.id;
        let planType    = 'premium';
        if (priceId === PRICE_IDS.family_monthly || priceId === PRICE_IDS.family_yearly) {
          planType = 'family';
        }

        const { error: upsertErr } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan_type: planType,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: 'active',
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (upsertErr) {
          console.error('[subscriptions/webhook] subscription upsert error', {
            user_id: userId, error: upsertErr.message,
          });
        }
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
          const { error: updateErr } = await supabase.from('subscriptions').update({
            status: stripeSub.status === 'active' ? 'active' : stripeSub.status,
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', stripeSub.id);

          if (updateErr) {
            console.error('[subscriptions/webhook] subscription.updated error', {
              subscription_id: stripeSub.id, error: updateErr.message,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        const { error: cancelErr } = await supabase.from('subscriptions').update({
          plan_type: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', stripeSub.id);

        if (cancelErr) {
          console.error('[subscriptions/webhook] subscription.deleted error', {
            subscription_id: stripeSub.id, error: cancelErr.message,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { error: failErr } = await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', invoice.subscription);

        if (failErr) {
          console.error('[subscriptions/webhook] invoice.payment_failed error', {
            subscription_id: invoice.subscription, error: failErr.message,
          });
        }
        break;
      }

    default:
        // Unhandled event type — ignore safely
        break;
    }
  } catch (err) {
    console.error('[subscriptions/webhook] unhandled exception in switch', {
      event_type: event.type, error: err.message, stack: err.stack,
    });
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
/**
 * POST /subscriptions/portal
 * Returns a Stripe Customer Portal URL so the user can manage billing.
 * Auth:  Bearer <supabase_jwt>
 * Body:  { return_url? }
 */
router.post('/portal', async (req, res) => {
  // Authenticate — derive user_id from JWT, not body
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token provided.' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }

  const { return_url } = req.body;
  const URL_RE = /^https?:\/\//;
  if (return_url && !URL_RE.test(return_url)) {
    return res.status(400).json({ error: 'return_url must be a valid URL.' });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer found for this user.' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: return_url ?? 'https://wealthwisekids.app',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[subscriptions/portal] Stripe billing portal error', {
      user_id: user.id, error: err.message,
    });
    res.status(500).json({ error: 'Failed to create billing portal session.' });
  }
});

module.exports = router;

