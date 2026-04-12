-- ============================================================
-- WealthWise Kids — Budget Tracker RLS Fixes
-- Run AFTER 006_school2_banking_101.sql
-- Adds:
--   • budget_parent_write  — parent can INSERT budget entries for their children
--   • budget_parent_delete — parent can DELETE non-Plaid entries for their children
--   • coin_tx_parent       — parent can SELECT coin transaction history for their children
-- ============================================================

-- Allow parents to manually add budget entries on behalf of their children.
-- The existing budget_child write policy only allows auth.uid() == child_id,
-- which never matches in the parent-session model used by this app.
CREATE POLICY "budget_parent_write" ON budget_entries
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Allow parents to delete their children's manually-added (non-Plaid) entries.
CREATE POLICY "budget_parent_delete" ON budget_entries
  FOR DELETE USING (
    is_from_plaid = FALSE
    AND child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- Allow parents to read their children's coin transaction history.
-- The existing coin_tx_child policy requires auth.uid() == child_id,
-- which does not match the parent session model.
CREATE POLICY "coin_tx_parent" ON coin_transactions
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
