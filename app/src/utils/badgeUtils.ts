import supabase from '../lib/supabase';

export interface BadgeRecord {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  rarity: 'common' | 'rare' | 'epic';
  trigger_type: string;
  trigger_value: string | null;
}

/**
 * checkAndAwardBadges
 * Evaluates all badges against a trigger event and awards any not yet earned.
 * Returns the array of newly awarded badges (shown in the BadgeAwardModal).
 *
 * @param childId   - The child's UUID
 * @param trigger   - The trigger_type string to match badges against
 * @param value     - Optional trigger value (e.g. school_id, streak count, coins total)
 */
export async function checkAndAwardBadges(
  childId: string,
  trigger: string,
  value?: string
): Promise<BadgeRecord[]> {
  // Fetch all badges matching this trigger type
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('trigger_type', trigger);

  if (!badges || badges.length === 0) return [];

  // Filter by trigger_value if provided
  const eligible = value
    ? badges.filter((b) => b.trigger_value === null || b.trigger_value === value)
    : badges;

  if (eligible.length === 0) return [];

  // Fetch already-earned badge IDs for this child
  const { data: alreadyEarned } = await supabase
    .from('student_badges')
    .select('badge_id')
    .eq('child_id', childId);

  const earnedIds = new Set((alreadyEarned ?? []).map((r) => r.badge_id));

  // Determine which badges to award
  const toAward = eligible.filter((b) => !earnedIds.has(b.id));
  if (toAward.length === 0) return [];

  // Insert all new badges
  await supabase.from('student_badges').insert(
    toAward.map((b) => ({
      child_id: childId,
      badge_id: b.id,
      earned_at: new Date().toISOString(),
    }))
  );

  return toAward as BadgeRecord[];
}

/**
 * awardCoins
 * Adds coins to the child's balance, logs the transaction, and checks coin milestone badges.
 * Returns any newly awarded coin badges so the caller can display them.
 */
export async function awardCoins(
  childId: string,
  amount: number,
  reason: string
): Promise<BadgeRecord[]> {
  // Log the transaction
  await supabase.from('coin_transactions').insert({ child_id: childId, amount, reason });

  // Increment balance
  const { data: current } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', childId)
    .single();

  const newBalance = (current?.balance ?? 0) + amount;

  if (current) {
    await supabase.from('wealth_coins').update({
      balance: newBalance,
      last_updated: new Date().toISOString(),
    }).eq('child_id', childId);
  } else {
    await supabase.from('wealth_coins').insert({
      child_id: childId, balance: newBalance, last_updated: new Date().toISOString(),
    });
  }

  return checkAndAwardCoinBadges(childId, newBalance);
}

/** Coin milestone thresholds — must match badge trigger_values in 008 migration */
const COIN_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * checkAndAwardCoinBadges
 * Awards all coin milestone badges the child has now crossed but hasn't earned yet.
 * Safe to call any time the coin balance changes.
 */
export async function checkAndAwardCoinBadges(
  childId: string,
  currentBalance: number
): Promise<BadgeRecord[]> {
  const crossed = COIN_MILESTONES.filter((m) => currentBalance >= m);
  if (crossed.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of crossed) {
    const badges = await checkAndAwardBadges(childId, 'coins_total', String(milestone));
    awarded.push(...badges);
  }
  return awarded;
}

/** Streak milestone thresholds — must match badge trigger_values in 008 migration */
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100];

/**
 * checkAndAwardStreakBadges
 * Awards all streak milestone badges for the given streak length.
 */
export async function checkAndAwardStreakBadges(
  childId: string,
  streakLength: number
): Promise<BadgeRecord[]> {
  const crossed = STREAK_MILESTONES.filter((m) => streakLength >= m);
  if (crossed.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of crossed) {
    const badges = await checkAndAwardBadges(childId, 'streak', String(milestone));
    awarded.push(...badges);
  }
  return awarded;
}

/** Lesson count milestone thresholds — must match badge trigger_values in 008 migration */
const LESSON_MILESTONES = [1, 3, 5, 10, 15, 20, 25, 50];

/**
 * checkAndAwardLessonBadges
 * Awards all lesson count badges crossed by the current completed count.
 */
export async function checkAndAwardLessonBadges(
  childId: string,
  completedCount: number
): Promise<BadgeRecord[]> {
  const crossed = LESSON_MILESTONES.filter((m) => completedCount >= m);
  if (crossed.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of crossed) {
    const badges = await checkAndAwardBadges(childId, 'lesson_complete', String(milestone));
    awarded.push(...badges);
  }
  return awarded;
}

/**
 * checkAndAwardPerfectCountBadges
 * Counts lifetime perfect quiz scores for the child, then awards any uncrossed badges.
 */
export async function checkAndAwardPerfectCountBadges(
  childId: string
): Promise<BadgeRecord[]> {
  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('score', 100);

  const total = count ?? 0;
  const milestones = [3, 5, 10].filter((m) => total >= m);
  if (milestones.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of milestones) {
    const badges = await checkAndAwardBadges(childId, 'quiz_perfect_count', String(milestone));
    awarded.push(...badges);
  }
  return awarded;
}

/** Budget entry milestone thresholds */
const BUDGET_MILESTONES = [1, 10, 30, 100];

/**
 * checkAndAwardBudgetEntryBadges
 * Counts total manual budget entries for the child, then awards uncrossed badges.
 */
export async function checkAndAwardBudgetEntryBadges(
  childId: string
): Promise<BadgeRecord[]> {
  const { count } = await supabase
    .from('budget_entries')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId);

  const total = count ?? 0;
  const crossed = BUDGET_MILESTONES.filter((m) => total >= m);
  if (crossed.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of crossed) {
    const badges = await checkAndAwardBadges(childId, 'budget_entry', String(milestone));
    awarded.push(...badges);
  }

  // Also check savings_entry milestones
  const savingsBadges = await checkAndAwardSavingsEntryBadges(childId);
  awarded.push(...savingsBadges);

  return awarded;
}

/** Savings entry milestone thresholds */
const SAVINGS_MILESTONES = [1, 5, 15, 30];

/**
 * checkAndAwardSavingsEntryBadges
 * Counts savings-category manual entries and awards uncrossed badges.
 */
export async function checkAndAwardSavingsEntryBadges(
  childId: string
): Promise<BadgeRecord[]> {
  const { count } = await supabase
    .from('budget_entries')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('category', 'savings');

  const total = count ?? 0;
  const crossed = SAVINGS_MILESTONES.filter((m) => total >= m);
  if (crossed.length === 0) return [];

  const awarded: BadgeRecord[] = [];
  for (const milestone of crossed) {
    const badges = await checkAndAwardBadges(childId, 'savings_entry', String(milestone));
    awarded.push(...badges);
  }
  return awarded;
}
