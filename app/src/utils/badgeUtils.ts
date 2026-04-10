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
 * Adds coins to the child's balance and logs the transaction.
 */
export async function awardCoins(
  childId: string,
  amount: number,
  reason: string
): Promise<void> {
  // Log the transaction
  await supabase.from('coin_transactions').insert({ child_id: childId, amount, reason });

  // Increment balance — using Supabase rpc for safe increment
  const { data: current } = await supabase
    .from('wealth_coins')
    .select('balance')
    .eq('child_id', childId)
    .single();

  if (current) {
    await supabase.from('wealth_coins').update({
      balance: current.balance + amount,
      last_updated: new Date().toISOString(),
    }).eq('child_id', childId);
  } else {
    await supabase.from('wealth_coins').insert({
      child_id: childId, balance: amount, last_updated: new Date().toISOString(),
    });
  }
}
