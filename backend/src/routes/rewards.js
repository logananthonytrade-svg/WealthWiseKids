const express = require('express');
const router  = express.Router();
const { supabase } = require('../server');

// ─── Streak multiplier table ──────────────────────────────────
// 7-day streak = 2x, 14-day = 3x, 30-day = 5x, otherwise 1x.
function streakMultiplier(streak) {
  if (streak >= 30) return 5;
  if (streak >= 14) return 3;
  if (streak >= 7)  return 2;
  return 1;
}

// ─── Coin amounts ─────────────────────────────────────────────
const BASE_COINS = {
  chapter_complete: 10,
  quiz_pass:        25,
  quiz_perfect:     50,
  school_complete:  200,
  // daily_streak is dynamic: 5 × multiplier(streak)
};

const VALID_EVENTS = Object.keys(BASE_COINS).concat('daily_streak');

/**
 * POST /rewards/award
 *
 * Awards WealthCoins for a specific learning event.  All coin grants flow
 * through here so they cannot be manipulated client-side.  Every award is
 * idempotent — a duplicate request for the same (child, reward_key) pair
 * returns coins_awarded: 0 rather than double-crediting.
 *
 * Body:
 *   {
 *     child_id:   UUID,
 *     event_type: "chapter_complete"|"quiz_pass"|"quiz_perfect"|"school_complete"|"daily_streak",
 *     metadata:   {
 *       lesson_id?: UUID,   // required for chapter_complete
 *       school_id?: number, // required for quiz_pass, quiz_perfect, school_complete
 *     }
 *   }
 *
 * Auth: Bearer <supabase_jwt>
 *
 * Response:
 *   { coins_awarded: number, new_balance: number, event: string, already_claimed: boolean }
 *
 * Reward amounts:
 *   chapter_complete  → 10 coins  (per lesson, one-time)
 *   quiz_pass         → 25 coins  (per school final quiz pass, one-time)
 *   quiz_perfect      → 50 coins  (per school final quiz perfect score, one-time)
 *   school_complete   → 200 coins (per school, one-time)
 *   daily_streak      → 5 × multiplier  (once per UTC day; multiplier 2× @7d, 3× @14d, 5× @30d)
 */
router.post('/award', async (req, res) => {

  // ── 1. Authenticate ──────────────────────────────────────────
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token provided.' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }

  // ── 2. Validate body ─────────────────────────────────────────
  const { child_id, event_type, metadata = {} } = req.body;

  if (!child_id || typeof child_id !== 'string') {
    return res.status(400).json({ error: 'child_id is required.' });
  }
  if (!event_type || !VALID_EVENTS.includes(event_type)) {
    return res.status(400).json({
      error: `event_type must be one of: ${VALID_EVENTS.join(', ')}.`,
    });
  }

  // ── 3. Authorise: caller must own this child ─────────────────
  const { data: child, error: childErr } = await supabase
    .from('child_profiles')
    .select('id, parent_id')
    .eq('id', child_id)
    .maybeSingle();

  if (childErr || !child) {
    return res.status(404).json({ error: 'Child not found.' });
  }
  if (child.parent_id !== user.id) {
    return res.status(403).json({ error: 'Not authorised to award coins for this child.' });
  }

  // ── 4. Build reward_key and compute coin amount ───────────────
  let rewardKey;
  let coinsToGrant;

  switch (event_type) {

    case 'chapter_complete': {
      if (!metadata.lesson_id || typeof metadata.lesson_id !== 'string') {
        return res.status(400).json({ error: 'metadata.lesson_id is required for chapter_complete.' });
      }
      // Verify the lesson exists
      const { data: lessonRow } = await supabase
        .from('lessons')
        .select('id')
        .eq('id', metadata.lesson_id)
        .maybeSingle();
      if (!lessonRow) return res.status(400).json({ error: 'Lesson not found.' });

      rewardKey   = `chapter_complete:${metadata.lesson_id}`;
      coinsToGrant = BASE_COINS.chapter_complete;
      break;
    }

    case 'quiz_pass': {
      const sid = parseInt(metadata.school_id, 10);
      if (!sid || isNaN(sid)) {
        return res.status(400).json({ error: 'metadata.school_id (integer) is required for quiz_pass.' });
      }
      rewardKey   = `quiz_pass:${sid}`;
      coinsToGrant = BASE_COINS.quiz_pass;
      break;
    }

    case 'quiz_perfect': {
      const sid = parseInt(metadata.school_id, 10);
      if (!sid || isNaN(sid)) {
        return res.status(400).json({ error: 'metadata.school_id (integer) is required for quiz_perfect.' });
      }
      rewardKey   = `quiz_perfect:${sid}`;
      coinsToGrant = BASE_COINS.quiz_perfect;
      break;
    }

    case 'school_complete': {
      const sid = parseInt(metadata.school_id, 10);
      if (!sid || isNaN(sid)) {
        return res.status(400).json({ error: 'metadata.school_id (integer) is required for school_complete.' });
      }
      rewardKey   = `school_complete:${sid}`;
      coinsToGrant = BASE_COINS.school_complete;
      break;
    }

    case 'daily_streak': {
      // Key is today's UTC date so only the first event of each day awards coins
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      rewardKey   = `daily_streak:${today}`;

      const { data: streakRow } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('child_id', child_id)
        .maybeSingle();

      const streak = streakRow?.current_streak ?? 1;
      coinsToGrant  = 5 * streakMultiplier(streak);
      break;
    }

    default:
      return res.status(400).json({ error: 'Unknown event_type.' });
  }

  // ── 5. Idempotency check ──────────────────────────────────────
  const { data: existing } = await supabase
    .from('reward_claims')
    .select('id, coins')
    .eq('child_id', child_id)
    .eq('reward_key', rewardKey)
    .maybeSingle();

  if (existing) {
    const { data: wallet } = await supabase
      .from('wealth_coins')
      .select('balance')
      .eq('child_id', child_id)
      .maybeSingle();

    return res.json({
      coins_awarded:  0,
      new_balance:    wallet?.balance ?? 0,
      event:          event_type,
      already_claimed: true,
    });
  }

  // ── 6. Insert claim row (unique constraint prevents double-award) ──
  const { error: claimErr } = await supabase
    .from('reward_claims')
    .insert({ child_id, reward_key: rewardKey, coins: coinsToGrant });

  if (claimErr) {
    // Unique violation = concurrent request already claimed it
    if (claimErr.code === '23505') {
      const { data: wallet } = await supabase
        .from('wealth_coins')
        .select('balance')
        .eq('child_id', child_id)
        .maybeSingle();
      return res.json({
        coins_awarded:  0,
        new_balance:    wallet?.balance ?? 0,
        event:          event_type,
        already_claimed: true,
      });
    }
    console.error('[rewards/award] claim insert error:', claimErr);
    return res.status(500).json({ error: 'Failed to record reward claim.' });
  }

  // ── 7. Log to coin_transactions ───────────────────────────────
  const { error: txErr } = await supabase
    .from('coin_transactions')
    .insert({ child_id, amount: coinsToGrant, reason: rewardKey });

  if (txErr) {
    console.error('[rewards/award] coin_transactions insert error:', txErr);
    // Non-fatal — claim is already recorded; continue to credit balance
  }

  // ── 8. Update wealth_coins balance ────────────────────────────
  const { data: walletRow } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', child_id)
    .maybeSingle();

  const newBalance = (walletRow?.balance ?? 0) + coinsToGrant;

  const { error: balanceErr } = await supabase
    .from('wealth_coins')
    .upsert(
      { child_id, balance: newBalance, last_updated: new Date().toISOString() },
      { onConflict: 'child_id' }
    );

  if (balanceErr) {
    console.error('[rewards/award] wealth_coins upsert error:', balanceErr);
    return res.status(500).json({ error: 'Failed to update coin balance.' });
  }

  // ── 9. Respond ────────────────────────────────────────────────
  res.json({
    coins_awarded:   coinsToGrant,
    new_balance:     newBalance,
    event:           event_type,
    already_claimed: false,
  });
});

module.exports = router;
