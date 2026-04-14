-- Drop policies so this script is safe to re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "progress_parent_write" ON student_progress;
  DROP POLICY IF EXISTS "progress_parent_update" ON student_progress;
  DROP POLICY IF EXISTS "attempts_parent_write" ON quiz_attempts;
  DROP POLICY IF EXISTS "coin_tx_parent_write" ON coin_transactions;
  DROP POLICY IF EXISTS "coins_parent_write" ON wealth_coins;
  DROP POLICY IF EXISTS "streaks_parent_write" ON streaks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- ============================================================
-- WealthWise Kids â€” RLS Parent-Session Model Fix
-- Run AFTER 008_badge_definitions.sql
--
-- Problem:
--   This app uses a "parent-session" auth model â€” auth.uid() is
--   ALWAYS the parent's UUID, never the child's UUID. Child profiles
--   are rows in child_profiles (not auth.users). As a result, every
--   write policy that checks `child_id = auth.uid()` silently rejects
--   all inserts/updates from the app.
--
-- Fix:
--   Add parent-write equivalents for every affected table so that
--   a logged-in parent can write on behalf of any of their children.
-- ============================================================

-- â”€â”€ student_progress write (parent session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Old policy only allowed child_id = auth.uid() which never matches.
DROP POLICY IF EXISTS "progress_child_write"  ON student_progress;
DROP POLICY IF EXISTS "progress_child_update" ON student_progress;
DROP POLICY IF EXISTS "progress_parent_write" ON student_progress;
DROP POLICY IF EXISTS "progress_parent_update" ON student_progress;

CREATE POLICY "progress_parent_write" ON student_progress
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

CREATE POLICY "progress_parent_update" ON student_progress
  FOR UPDATE USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ quiz_attempts write (parent session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "attempts_child_write"  ON quiz_attempts;
DROP POLICY IF EXISTS "attempts_parent_write" ON quiz_attempts;

CREATE POLICY "attempts_parent_write" ON quiz_attempts
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ coin_transactions write (parent session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "coin_tx_write"         ON coin_transactions;
DROP POLICY IF EXISTS "coin_tx_parent_write"  ON coin_transactions;

CREATE POLICY "coin_tx_parent_write" ON coin_transactions
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ wealth_coins write (parent session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "coins_child_write"   ON wealth_coins;
DROP POLICY IF EXISTS "coins_parent_write"  ON wealth_coins;

CREATE POLICY "coins_parent_write" ON wealth_coins
  FOR ALL USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ streaks write (parent session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "streaks_write"         ON streaks;
DROP POLICY IF EXISTS "streaks_parent_write"  ON streaks;

CREATE POLICY "streaks_parent_write" ON streaks
  FOR ALL USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ student_badges write already fixed in 008 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- (008_badge_definitions.sql already dropped the old policy and
--  created the correct parent-session version â€” nothing to do here)

-- â”€â”€ Verify policies are in place (run this manually to check) â”€â”€â”€â”€
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN (
--   'student_progress','quiz_attempts','coin_transactions','wealth_coins','streaks'
-- )
-- ORDER BY tablename, policyname;
