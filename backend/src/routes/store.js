const express = require('express');
const router  = express.Router();
const Stripe  = require('stripe');
const { supabase } = require('../server');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ── Shared helpers ─────────────────────────────────────────────────────────

async function authenticate(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No auth token provided.' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired auth token.' });
    return null;
  }
  return user;
}

async function verifyParentOwnsChild(userId, childId, res) {
  const { data: child } = await supabase
    .from('child_profiles')
    .select('id, parent_id')
    .eq('id', childId)
    .maybeSingle();
  if (!child) {
    res.status(404).json({ error: 'Child not found.' });
    return false;
  }
  if (child.parent_id !== userId) {
    res.status(403).json({ error: 'You are not authorised to update this child.' });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /store/catalog/:child_id
 * Returns the full store catalog with per-child ownership flags and coin balance.
 * Auth: Bearer <supabase_jwt>
 * Returns: { balance, items: StoreItem[], packs: CoinPack[] }
 */
router.get('/catalog/:child_id', async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;

  const { child_id } = req.params;
  const ok = await verifyParentOwnsChild(user.id, child_id, res);
  if (!ok) return;

  const [itemsRes, packsRes, balanceRes, ownedRes] = await Promise.all([
    supabase.from('store_items').select('*').eq('is_active', true).order('order_number'),
    supabase.from('coin_packs').select('*').order('order_number'),
    supabase.from('wealth_coins').select('balance').eq('child_id', child_id).maybeSingle(),
    supabase.from('item_purchases').select('item_id').eq('child_id', child_id),
  ]);

  const ownedIds = new Set((ownedRes.data ?? []).map((r) => r.item_id));
  const items = (itemsRes.data ?? []).map((item) => ({
    ...item,
    owned: ownedIds.has(item.id),
  }));

  res.json({
    balance: balanceRes.data?.balance ?? 0,
    items,
    packs: packsRes.data ?? [],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /store/buy-item
 * Deducts coins and permanently records ownership for a store item.
 * The UNIQUE (child_id, item_id) constraint prevents double-purchase under
 * concurrent requests — if the INSERT fails we roll back the balance deduction.
 *
 * Auth:  Bearer <supabase_jwt>
 * Body:  { child_id: UUID, item_id: number }
 * Returns: { new_balance: number, item: StoreItem }
 */
router.post('/buy-item', async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;

  const { child_id, item_id } = req.body;
  if (!child_id || item_id == null) {
    return res.status(400).json({ error: 'child_id and item_id are required.' });
  }
  if (!Number.isInteger(item_id) || item_id < 1) {
    return res.status(400).json({ error: 'Invalid item_id.' });
  }

  const ok = await verifyParentOwnsChild(user.id, child_id, res);
  if (!ok) return;

  // Load item
  const { data: item } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', item_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!item) return res.status(404).json({ error: 'Item not found.' });

  // Check not already owned
  const { data: existing } = await supabase
    .from('item_purchases')
    .select('id')
    .eq('child_id', child_id)
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'Item already owned.' });

  // Check balance
  const { data: walletRow } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', child_id)
    .maybeSingle();

  const currentBalance = walletRow?.balance ?? 0;
  if (currentBalance < item.coin_cost) {
    return res.status(402).json({
      error: `Insufficient coins. Need ${item.coin_cost}, have ${currentBalance}.`,
    });
  }

  const newBalance = currentBalance - item.coin_cost;

  // Deduct coins
  const { error: walletErr } = await supabase
    .from('wealth_coins')
    .upsert(
      { child_id, balance: newBalance, last_updated: new Date().toISOString() },
      { onConflict: 'child_id' }
    );

  if (walletErr) {
    console.error('Wallet deduction error:', walletErr);
    return res.status(500).json({ error: 'Failed to deduct coins.' });
  }

  // Log the spend
  await supabase.from('coin_transactions').insert({
    child_id,
    amount: -item.coin_cost,
    reason: `Purchased store item: ${item.name}`,
  });

  // Record ownership — UNIQUE constraint prevents concurrent double-buy
  const { error: purchaseErr } = await supabase
    .from('item_purchases')
    .insert({ child_id, item_id });

  if (purchaseErr) {
    // Compensating rollback: restore the deducted balance
    await supabase
      .from('wealth_coins')
      .upsert(
        { child_id, balance: currentBalance, last_updated: new Date().toISOString() },
        { onConflict: 'child_id' }
      );
    // Reverse the transaction log
    await supabase.from('coin_transactions').insert({
      child_id,
      amount: item.coin_cost,
      reason: `Rolled back: failed purchase of ${item.name}`,
    });
    console.error('Item purchase insert error:', purchaseErr);
    return res.status(500).json({ error: 'Failed to record purchase — coins refunded.' });
  }

  res.json({ new_balance: newBalance, item: { ...item, owned: true } });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /store/buy-coins
 * Creates a Stripe Checkout session (mode: 'payment') for a coin pack.
 * The webhook (/store/coins-webhook) awards the coins after confirmed payment.
 *
 * Auth:  Bearer <supabase_jwt>
 * Body:  { child_id: UUID, pack_id: number, success_url?, cancel_url? }
 * Returns: { url: string, session_id: string }
 */
router.post('/buy-coins', async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;

  const { child_id, pack_id, success_url, cancel_url } = req.body;
  if (!child_id || pack_id == null) {
    return res.status(400).json({ error: 'child_id and pack_id are required.' });
  }

  const ok = await verifyParentOwnsChild(user.id, child_id, res);
  if (!ok) return;

  // Load pack
  const { data: pack } = await supabase
    .from('coin_packs')
    .select('*')
    .eq('id', pack_id)
    .maybeSingle();

  if (!pack) return res.status(404).json({ error: 'Coin pack not found.' });

  // Get or reuse existing Stripe customer
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let customerId = subRow?.stripe_customer_id;
  if (!customerId) {
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
    const customer = await stripe.customers.create({
      email: authUser?.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(pack.price_usd * 100),
          product_data: {
            name: `WealthWiseKids — ${pack.name} Coin Pack`,
            description: `${pack.coins.toLocaleString()} WealthCoins added to ${child_id}'s balance`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type:     'coin_pack',
        user_id:  user.id,
        child_id,
        pack_id:  String(pack.id),
        coins:    String(pack.coins),
      },
      success_url: success_url ?? `${process.env.APP_URL ?? 'https://wealthwisekids.app'}/coins-success`,
      cancel_url:  cancel_url  ?? `${process.env.APP_URL ?? 'https://wealthwisekids.app'}/coins-cancel`,
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Stripe checkout error (coins):', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /store/coins-webhook
 * Stripe fires checkout.session.completed when the payment succeeds.
 * Idempotent: keyed on stripe payment_intent — safe to retry.
 *
 * NOTE: server.js must register raw body for this path BEFORE express.json().
 * Uses STRIPE_COINS_WEBHOOK_SECRET env var (separate from subscription webhook).
 */
router.post('/coins-webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_COINS_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Coins webhook signature invalid:', err.message);
    return res.status(400).json({ error: 'Webhook signature invalid.' });
  }

  // Only handle completed payment checkouts
  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== 'paid' || session.metadata?.type !== 'coin_pack') {
    return res.json({ received: true });
  }

  const { user_id, child_id, pack_id, coins } = session.metadata;
  if (!user_id || !child_id || !coins) {
    console.error('Coins webhook: missing metadata', session.metadata);
    return res.status(400).json({ error: 'Missing metadata.' });
  }

  const coinsAmount   = parseInt(coins, 10);
  const paymentIntent = session.payment_intent;

  // Idempotency check — stripe_payment_id has UNIQUE constraint
  const { data: already } = await supabase
    .from('coin_pack_purchases')
    .select('id')
    .eq('stripe_payment_id', paymentIntent)
    .maybeSingle();

  if (already) return res.json({ received: true }); // already processed

  // Log the purchase
  await supabase.from('coin_pack_purchases').insert({
    user_id,
    child_id,
    pack_id:           parseInt(pack_id, 10),
    coins_granted:     coinsAmount,
    stripe_payment_id: paymentIntent,
  });

  // Log the coin transaction
  await supabase.from('coin_transactions').insert({
    child_id,
    amount: coinsAmount,
    reason: `Purchased coin pack (${coinsAmount.toLocaleString()} coins)`,
  });

  // Increment wallet balance
  const { data: walletRow } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', child_id)
    .maybeSingle();

  const newBalance = (walletRow?.balance ?? 0) + coinsAmount;
  await supabase.from('wealth_coins').upsert(
    { child_id, balance: newBalance, last_updated: new Date().toISOString() },
    { onConflict: 'child_id' }
  );

  console.log(`[store] Awarded ${coinsAmount} coins to child ${child_id} via pack purchase ${paymentIntent}`);
  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /store/claim-monthly-bonus
 * Awards 150 coins to a premium subscriber's child once per calendar month.
 * Completely idempotent — safe to call on every app launch.
 *
 * Auth:  Bearer <supabase_jwt>
 * Body:  { child_id: UUID }
 * Returns: { coins_awarded: number, already_claimed: boolean, month_key: string }
 */
router.post('/claim-monthly-bonus', async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;

  const { child_id } = req.body;
  if (!child_id) return res.status(400).json({ error: 'child_id is required.' });

  const ok = await verifyParentOwnsChild(user.id, child_id, res);
  if (!ok) return;

  // Verify parent has an active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_type, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const isActive = sub?.status === 'active' &&
    (!sub?.current_period_end || new Date(sub.current_period_end) > new Date());

  if (!isActive) {
    return res.status(403).json({ error: 'Active premium subscription required.' });
  }

  // Idempotency key: 'YYYY-MM'
  const now      = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Attempt insert — UNIQUE (child_id, month_key) will reject duplicates
  const { error: insertErr } = await supabase
    .from('monthly_bonus_log')
    .insert({ child_id, month_key });

  if (insertErr) {
    // Unique violation → already claimed this month
    return res.json({ coins_awarded: 0, already_claimed: true, month_key });
  }

  const BONUS = 150;

  await supabase.from('coin_transactions').insert({
    child_id,
    amount: BONUS,
    reason: `Premium monthly bonus — ${monthKey}`,
  });

  const { data: walletRow } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', child_id)
    .maybeSingle();

  const newBalance = (walletRow?.balance ?? 0) + BONUS;
  await supabase.from('wealth_coins').upsert(
    { child_id, balance: newBalance, last_updated: new Date().toISOString() },
    { onConflict: 'child_id' }
  );

  console.log(`[store] Monthly bonus of ${BONUS} coins awarded to child ${child_id} for ${monthKey}`);
  res.json({ coins_awarded: BONUS, already_claimed: false, month_key });
});

module.exports = router;
