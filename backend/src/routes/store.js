const express  = require('express');
const router   = express.Router();
const { supabase } = require('../lib/supabaseAdmin');
const { isUUID, isPosInt, validateBody, validateUUIDParam } = require('../middleware/validate');

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
router.get('/catalog/:child_id', validateUUIDParam('child_id'), async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;

  const { child_id } = req.params;
  const ok = await verifyParentOwnsChild(user.id, child_id, res);
  if (!ok) return;

  const [itemsRes, balanceRes, ownedRes] = await Promise.all([
    supabase.from('store_items').select('*').eq('is_active', true).order('order_number'),
    supabase.from('wealth_coins').select('balance').eq('child_id', child_id).maybeSingle(),
    supabase.from('item_purchases').select('item_id').eq('child_id', child_id),
  ]);

  if (itemsRes.error) {
    console.error('[store/catalog] store_items fetch error', { child_id, error: itemsRes.error.message });
    return res.status(500).json({ error: 'Failed to load catalog.' });
  }

  const ownedIds = new Set((ownedRes.data ?? []).map((r) => r.item_id));
  const items = (itemsRes.data ?? []).map((item) => ({
    ...item,
    owned: ownedIds.has(item.id),
  }));

  res.json({
    balance: balanceRes.data?.balance ?? 0,
    items,
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
  const validErr = validateBody(req.body, [
    { field: 'child_id', type: 'uuid' },
    { field: 'item_id',  type: 'posInt' },
  ]);
  if (validErr) return res.status(400).json({ error: validErr });

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
    console.error('[store/buy-item] wallet deduction error', { child_id, item_id, error: walletErr.message });
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
    console.error('[store/buy-item] purchase insert error — coins rolled back', {
      child_id, item_id, item_name: item.name, error: purchaseErr.message, code: purchaseErr.code,
    });
    return res.status(500).json({ error: 'Failed to record purchase — coins refunded.' });
  }

  res.json({ new_balance: newBalance, item: { ...item, owned: true } });
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
  if (!isUUID(child_id)) {
    return res.status(400).json({ error: 'child_id must be a valid UUID.' });
  }

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
    if (insertErr.code === '23505') {
      // Unique violation → already claimed this month
      return res.json({ coins_awarded: 0, already_claimed: true, month_key });
    }
    console.error('[store/claim-monthly-bonus] insert error', {
      child_id, month_key, error: insertErr.message, code: insertErr.code,
    });
    return res.status(500).json({ error: 'Failed to record bonus claim.' });
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
