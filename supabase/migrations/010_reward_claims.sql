-- Drop policies so this script is safe to re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "reward_claims_parent" ON reward_claims;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- ============================================================
-- WealthWise Kids â€” Reward Claims (idempotency table)
-- Run after 009_rls_parent_session_fix.sql
--
-- reward_claims stores one row per (child, reward_key) pair.
-- reward_key examples:
--   "chapter_complete:<lesson_uuid>"
--   "quiz_pass:<school_id>"
--   "quiz_perfect:<school_id>"
--   "school_complete:<school_id>"
--   "daily_streak:2026-04-12"
--
-- The UNIQUE(child_id, reward_key) constraint is the database-level
-- guard against double-awarding even under concurrent requests (the
-- backend INSERT will raise code 23505 on a race condition).
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_claims (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  reward_key  TEXT        NOT NULL,
  coins       INTEGER     NOT NULL CHECK (coins > 0),
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, reward_key)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_child ON reward_claims(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_date  ON reward_claims(claimed_at DESC);

ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Parent can audit their children's reward history
CREATE POLICY "reward_claims_parent_read" ON reward_claims
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Backend service-role key bypasses RLS for all writes â€” no client write policy needed.
