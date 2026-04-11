const express = require('express');
const router  = express.Router();
const { supabase } = require('../server');

// ─── Coin Tier Table ──────────────────────────────────────────
// Returns the max coins earnable at the given school percentage.
// Brackets are exact as specified — do not change.
function getCoinTier(percentage) {
  if (percentage >= 90) return 150;
  if (percentage >= 80) return 125;
  if (percentage >= 70) return 100;
  if (percentage >= 60) return 80;
  if (percentage >= 50) return 70;
  if (percentage >= 40) return 50;
  if (percentage >= 30) return 30;
  return 10;
}

/**
 * POST /schools/award-coins
 *
 * Records a chapter quiz score and awards coins based on the school's
 * overall performance tier. Implements the anti-farming logic:
 * coins are only awarded as the DELTA between the new tier and the
 * best tier ever reached for this school.
 *
 * Called on EVERY chapter quiz completion (pass or fail).
 *
 * Body:  { child_id, school_id, lesson_id, percent_score }
 * Auth:  Bearer <supabase_jwt>
 *
 * Returns:
 * {
 *   coins_awarded:      number,   // actual coins added to balance this call (0 if no improvement)
 *   best_coins_earned:  number,   // cumulative best for this school (0–150)
 *   best_total_points:  number,   // sum of best scores across all lessons (0–350)
 *   best_percentage:    number,   // best_total_points / (lessons × 50) × 100
 *   coin_tier:          number,   // tier the current percentage maps to (150/125/100/80/70/50/30/10)
 *   quizzes_recorded:   number,   // how many chapter quizzes have a score so far
 *   total_quizzes:      number,   // total chapter quizzes in this school (7)
 * }
 */
router.post('/award-coins', async (req, res) => {
  // ── 1. Authenticate ─────────────────────────────────────────
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token provided.' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }

  // ── 2. Validate body ─────────────────────────────────────────
  const { child_id, school_id, lesson_id, percent_score } = req.body;

  if (!child_id || !school_id || !lesson_id || percent_score == null) {
    return res.status(400).json({ error: 'child_id, school_id, lesson_id, and percent_score are required.' });
  }
  if (typeof percent_score !== 'number' || percent_score < 0 || percent_score > 100) {
    return res.status(400).json({ error: 'percent_score must be a number between 0 and 100.' });
  }
  if (!Number.isInteger(school_id) || school_id < 1) {
    return res.status(400).json({ error: 'Invalid school_id.' });
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
    return res.status(403).json({ error: 'You are not authorised to update this child.' });
  }

  // ── 4. Verify lesson belongs to this school ──────────────────
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id')
    .eq('id', lesson_id)
    .eq('school_id', school_id)
    .maybeSingle();

  if (lessonErr || !lesson) {
    return res.status(400).json({ error: 'Lesson does not belong to this school.' });
  }

  // ── 5. Convert percent → 0–50 score ─────────────────────────
  const score50 = Math.round(percent_score * 50 / 100);

  // ── 6. Upsert best score (only store improvement) ────────────
  const { data: existingScore } = await supabase
    .from('quiz_best_scores')
    .select('best_score')
    .eq('child_id', child_id)
    .eq('lesson_id', lesson_id)
    .maybeSingle();

  const prevBest = existingScore?.best_score ?? 0;
  const newBest  = Math.max(prevBest, score50);

  const { error: upsertErr } = await supabase
    .from('quiz_best_scores')
    .upsert({
      child_id,
      school_id,
      lesson_id,
      best_score: newBest,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'child_id,lesson_id' });

  if (upsertErr) {
    console.error('quiz_best_scores upsert error:', upsertErr);
    return res.status(500).json({ error: 'Failed to save score.' });
  }

  // ── 7. Get all lesson IDs for this school ────────────────────
  const { data: schoolLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('school_id', school_id)
    .order('lesson_number', { ascending: true });

  const totalLessons = (schoolLessons ?? []).length; // should be 7

  // ── 8. Sum all best scores for this child × school ───────────
  const { data: allBestScores } = await supabase
    .from('quiz_best_scores')
    .select('best_score')
    .eq('child_id', child_id)
    .eq('school_id', school_id);

  const totalPoints   = (allBestScores ?? []).reduce((sum, r) => sum + r.best_score, 0);
  const maxPoints     = totalLessons * 50;                              // 350
  const schoolPct     = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  const potentialTier = getCoinTier(schoolPct);

  // ── 9. Anti-farming: award only the delta ────────────────────
  const { data: awardRow } = await supabase
    .from('school_coin_awards')
    .select('best_coins_earned, best_total_points')
    .eq('child_id', child_id)
    .eq('school_id', school_id)
    .maybeSingle();

  const bestCoinsEarned = awardRow?.best_coins_earned ?? 0;
  const coinsToAward    = Math.max(0, potentialTier - bestCoinsEarned);
  const newBestCoins    = Math.max(bestCoinsEarned, potentialTier);

  // Always update the award row (points/percentage even if no new coins)
  const { error: awardErr } = await supabase
    .from('school_coin_awards')
    .upsert({
      child_id,
      school_id,
      best_coins_earned: newBestCoins,
      best_total_points: totalPoints,
      best_percentage:   parseFloat(schoolPct.toFixed(2)),
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'child_id,school_id' });

  if (awardErr) {
    console.error('school_coin_awards upsert error:', awardErr);
    return res.status(500).json({ error: 'Failed to update school award.' });
  }

  // ── 10. Credit coins if tier improved ────────────────────────
  if (coinsToAward > 0) {
    // Log the transaction
    await supabase.from('coin_transactions').insert({
      child_id,
      amount: coinsToAward,
      reason: `School ${school_id}: ${schoolPct.toFixed(1)}% performance (tier ${potentialTier} coins)`,
    });

    // Increment wealth_coins balance safely
    const { data: walletRow } = await supabase
      .from('wealth_coins')
      .select('balance')
      .eq('child_id', child_id)
      .maybeSingle();

    const newBalance = (walletRow?.balance ?? 0) + coinsToAward;

    await supabase.from('wealth_coins').upsert(
      { child_id, balance: newBalance, last_updated: new Date().toISOString() },
      { onConflict: 'child_id' }
    );
  }

  // ── 11. Respond ──────────────────────────────────────────────
  res.json({
    coins_awarded:    coinsToAward,
    best_coins_earned: newBestCoins,
    best_total_points: totalPoints,
    best_percentage:   parseFloat(schoolPct.toFixed(2)),
    coin_tier:         potentialTier,
    quizzes_recorded: (allBestScores ?? []).length,
    total_quizzes:    totalLessons,
  });
});

/**
 * GET /schools/coin-progress/:child_id/:school_id
 * Returns the current school coin progress for a child.
 * Auth: Bearer <supabase_jwt>
 */
router.get('/coin-progress/:child_id/:school_id', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token.' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token.' });

  const { child_id, school_id } = req.params;

  // Verify ownership
  const { data: child } = await supabase
    .from('child_profiles')
    .select('id, parent_id')
    .eq('id', child_id)
    .maybeSingle();

  if (!child || child.parent_id !== user.id) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const { data: awardRow } = await supabase
    .from('school_coin_awards')
    .select('best_coins_earned, best_total_points, best_percentage')
    .eq('child_id', child_id)
    .eq('school_id', school_id)
    .maybeSingle();

  res.json({
    best_coins_earned:  awardRow?.best_coins_earned ?? 0,
    best_total_points:  awardRow?.best_total_points ?? 0,
    best_percentage:    awardRow?.best_percentage ?? 0,
    coin_tier:          getCoinTier(awardRow?.best_percentage ?? 0),
    max_coins:          150,
    max_points:         350,
  });
});

module.exports = router;
