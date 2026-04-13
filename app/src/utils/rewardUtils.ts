import supabase from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface RewardResult {
  coins_awarded:   number;
  new_balance:     number;
  event:           string;
  already_claimed: boolean;
}

/**
 * awardCoins — calls POST /rewards/award on the backend.
 *
 * All coin grants are gated server-side; the client only signals
 * that an event occurred.  Returns null on network failure (non-fatal).
 *
 * @param childId   — child_profiles.id
 * @param eventType — one of: chapter_complete | quiz_pass | quiz_perfect |
 *                             school_complete | daily_streak
 * @param metadata  — { lesson_id } for chapter_complete;
 *                    { school_id } for quiz_pass / quiz_perfect / school_complete;
 *                    {} for daily_streak
 */
export async function awardCoins(
  childId:   string,
  eventType: 'chapter_complete' | 'quiz_pass' | 'quiz_perfect' | 'school_complete' | 'daily_streak',
  metadata:  Record<string, unknown> = {},
): Promise<RewardResult | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const res = await fetch(`${API_URL}/rewards/award`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ child_id: childId, event_type: eventType, metadata }),
    });

    if (!res.ok) {
      console.warn(`[awardCoins] ${eventType} — server responded ${res.status}`);
      return null;
    }

    return await res.json() as RewardResult;
  } catch (err) {
    console.warn('[awardCoins] network error:', err);
    return null;
  }
}
