-- ============================================================
-- WealthWise Kids — RLS Gap Fix (remaining tables)
-- Run AFTER 010_reward_claims.sql
--
-- This migration fixes the two remaining tables that still use
-- the broken `child_id = auth.uid()` pattern, and adds missing
-- parent-read policies for the parent reports screen.
--
-- Tables fixed:
--   • saving_goals  — write was completely broken (parent session model)
--   • budget_entries — UPDATE was missing from parent-session policies
--
-- RLS ownership matrix after this migration (complete):
-- ─────────────────────────────────────────────────────────────
--   Table                  | Client reads via        | Writes via
--   ───────────────────────────────────────────────────────────
--   profiles               | auth.uid() = id         | trigger (signup)
--   child_profiles         | parent_id = auth.uid()  | client (parent session)
--   parental_consents      | parent_id = auth.uid()  | service_role (backend)
--   subscriptions          | user_id = auth.uid()    | service_role (Stripe whk)
--   schools                | public                  | —
--   lessons                | public                  | —
--   quiz_questions         | public                  | —
--   student_progress       | parent session (009)    | parent session (009)
--   quiz_attempts          | parent session (009)    | parent session (009)
--   badges                 | public                  | —
--   student_badges         | parent session (008)    | parent session (008)
--   wealth_coins           | parent session (009)    | parent session (009)
--   coin_transactions      | parent session (007)    | parent session (009)
--   streaks                | parent session (009)    | parent session (009)
--   budget_entries         | parent session (001/007)| parent session (007/THIS)
--   saving_goals           | parent session (THIS)   | parent session (THIS)
--   quiz_best_scores       | parent session (004)    | service_role only
--   school_coin_awards     | parent session (004)    | service_role only
--   coin_packs             | public                  | —
--   store_items            | public                  | —
--   item_purchases         | parent session (005)    | service_role only
--   coin_pack_purchases    | user_id = auth.uid()    | service_role only
--   monthly_bonus_log      | none needed             | service_role only
--   reward_claims          | parent session (010)    | service_role only
--   wealth_coins_log       | parent session (003v2)  | service_role only
--   weekly_events          | authenticated read      | service_role only
--   weekly_event_completions| parent session (003v2) | service_role only
--   virtual_portfolio      | parent session (003v2)  | service_role only
--   virtual_trades         | parent session (003v2)  | service_role only
-- ============================================================

-- ── saving_goals — full parent-session fix ───────────────────
-- The existing "goals_child" policy uses child_id = auth.uid()
-- which ALWAYS fails because auth.uid() is the parent UUID.
-- Drop it and replace with correct parent-session policies.
DROP POLICY IF EXISTS "goals_child"         ON saving_goals;
DROP POLICY IF EXISTS "goals_parent"        ON saving_goals;
DROP POLICY IF EXISTS "goals_parent_read"   ON saving_goals;
DROP POLICY IF EXISTS "goals_parent_write"  ON saving_goals;

-- Parent can read their children's saving goals (reports screen)
CREATE POLICY "goals_parent_read" ON saving_goals
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Parent can create and update saving goals on behalf of their children
CREATE POLICY "goals_parent_write" ON saving_goals
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

CREATE POLICY "goals_parent_update" ON saving_goals
  FOR UPDATE USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

CREATE POLICY "goals_parent_delete" ON saving_goals
  FOR DELETE USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );


-- ── budget_entries — add missing parent UPDATE policy ────────
-- 007_budget_tracker_rls.sql added INSERT and DELETE for parents,
-- but UPDATE was omitted. Without it, editing an existing budget
-- entry silently fails.
DROP POLICY IF EXISTS "budget_parent_update" ON budget_entries;

CREATE POLICY "budget_parent_update" ON budget_entries
  FOR UPDATE USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );


-- ── Verification query (run manually to confirm) ─────────────
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN (
--   'saving_goals', 'budget_entries', 'virtual_portfolio',
--   'virtual_trades', 'wealth_coins_log', 'weekly_events',
--   'weekly_event_completions'
-- )
-- ORDER BY tablename, policyname;
