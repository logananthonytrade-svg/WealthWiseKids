-- ============================================================
-- WealthWise Kids — School Coin Tier System
-- Run AFTER 003_lesson_chapters.sql
--
-- Adds:
--   • quiz_best_scores   — best score (0–50) per child per lesson quiz
--   • school_coin_awards — anti-farming coin tracker per child per school
--
-- Security model:
--   • Clients (child JWT) can only READ these tables.
--   • All WRITES go through the backend Express server using the
--     service_role key, which bypasses RLS. This prevents client
--     tampering with scores or coin amounts.
-- ============================================================

-- ─── 1. quiz_best_scores ─────────────────────────────────────
-- Stores the single best quiz score (0–50) per child per chapter lesson.
-- Score is stored on a 0–50 scale (percent × 0.5).
-- Total across all 7 lessons = max 350 points per school.
CREATE TABLE IF NOT EXISTS quiz_best_scores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  school_id   INTEGER     NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lesson_id   UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  best_score  INTEGER     NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 50),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_qbs_child_school ON quiz_best_scores(child_id, school_id);

ALTER TABLE quiz_best_scores ENABLE ROW LEVEL SECURITY;

-- Child can read their own scores (for progress display)
CREATE POLICY "qbs_child_read" ON quiz_best_scores
  FOR SELECT USING (child_id = auth.uid());

-- Parent can read their child's scores (for reports)
CREATE POLICY "qbs_parent_read" ON quiz_best_scores
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client INSERT/UPDATE — server only via service_role

-- ─── 2. school_coin_awards ───────────────────────────────────
-- Anti-farming tracker: stores the highest coin tier ever reached
-- per child per school. Coins are only ever awarded as the delta
-- between the new tier and this stored value.
CREATE TABLE IF NOT EXISTS school_coin_awards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID          NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  school_id         INTEGER       NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  best_coins_earned INTEGER       NOT NULL DEFAULT 0 CHECK (best_coins_earned BETWEEN 0 AND 150),
  best_total_points INTEGER       NOT NULL DEFAULT 0 CHECK (best_total_points BETWEEN 0 AND 350),
  best_percentage   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (best_percentage BETWEEN 0 AND 100),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, school_id)
);
CREATE INDEX IF NOT EXISTS idx_sca_child ON school_coin_awards(child_id);

ALTER TABLE school_coin_awards ENABLE ROW LEVEL SECURITY;

-- Child can read their own award record
CREATE POLICY "sca_child_read" ON school_coin_awards
  FOR SELECT USING (child_id = auth.uid());

-- Parent can read their child's award records
CREATE POLICY "sca_parent_read" ON school_coin_awards
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client INSERT/UPDATE — server only via service_role
