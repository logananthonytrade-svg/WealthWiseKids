import supabase from '../lib/supabase';

/**
 * updateStreak — called every time a child completes a lesson.
 * - Today already counted  → no-op
 * - Yesterday → increment streak
 * - 2+ days ago + freeze available → use freeze, reset to 1 (preserves streak briefly)
 * - 2+ days ago + no freeze → reset to 1
 */
/** Return value from updateStreak — caller uses newStreak for badge checks */
export interface StreakResult {
  newStreak: number;
}

export async function updateStreak(childId: string): Promise<StreakResult> {
  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  if (!data) {
    // Create the row if somehow missing
    await supabase.from('streaks').insert({ child_id: childId, current_streak: 1, last_activity_date: today() });
    return { newStreak: 1 };
  }

  const lastDate  = data.last_activity_date;   // 'YYYY-MM-DD' or null
  const todayDate = today();

  if (lastDate === todayDate) return { newStreak: data.current_streak }; // Already counted today

  const daysSince = lastDate ? daysBetween(lastDate, todayDate) : null;
  let newStreak   = data.current_streak;
  let freeze      = data.freeze_available;

  if (daysSince === 1) {
    // ✅ Kept the streak alive
    newStreak += 1;
  } else {
    // ❌ Missed day(s)
    if (freeze && daysSince !== null && daysSince <= 2) {
      // Use freeze — streak continues but freeze consumed
      newStreak += 1;
      freeze = false;
    } else {
      // Reset
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(newStreak, data.longest_streak);

  await supabase.from('streaks').update({
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_activity_date: todayDate,
    freeze_available: freeze,
  }).eq('child_id', childId);

  return { newStreak };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const ms = new Date(dateB).getTime() - new Date(dateA).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
