-- Drop policies so this script is safe to re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "wcl_parent_read" ON wealth_coins_log;
  DROP POLICY IF EXISTS "we_authenticated_read" ON weekly_events;
  DROP POLICY IF EXISTS "wec_parent_read" ON weekly_event_completions;
  DROP POLICY IF EXISTS "vp_parent_read" ON virtual_portfolio;
  DROP POLICY IF EXISTS "vt_parent_read" ON virtual_trades;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- ============================================================
-- WealthWise Kids â€” Economy Extension Tables
-- Run AFTER 003_lesson_chapters.sql, BEFORE 004_school_coins.sql
--
-- Adds:
--   â€¢ wealth_coins_log        â€” balance-snapshot ledger (balance_before/after)
--   â€¢ weekly_events           â€” time-limited challenges & bonus events
--   â€¢ weekly_event_completions â€” per-child completion tracking
--   â€¢ virtual_portfolio       â€” simulated long-term stock positions
--   â€¢ virtual_trades          â€” individual simulated buy/sell transactions
--
-- Security model (all tables):
--   â€¢ Clients (parent JWT) can only READ.
--   â€¢ ALL WRITES go through the Express backend using service_role key,
--     which bypasses RLS â€” this prevents score / balance tampering.
-- ============================================================

-- â”€â”€â”€ 1. wealth_coins_log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Append-only audit ledger. Complements coin_transactions by
-- capturing the balance snapshot at each event, enabling a
-- full wallet history screen with running totals.
CREATE TABLE IF NOT EXISTS wealth_coins_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  amount         INTEGER     NOT NULL,   -- positive = earned, negative = spent
  balance_before INTEGER     NOT NULL DEFAULT 0 CHECK (balance_before >= 0),
  balance_after  INTEGER     NOT NULL DEFAULT 0 CHECK (balance_after  >= 0),
  event_type     TEXT        NOT NULL,   -- 'chapter_complete' | 'quiz_pass' | 'quiz_perfect' |
                                          -- 'school_complete' | 'daily_streak' | 'store_purchase' |
                                          -- 'monthly_bonus'   | 'pack_purchase' | 'manual_adjust'
  reference_id   TEXT,                   -- lesson_id, school_id, item_id, reward_key, etc.
  description    TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wcl_child      ON wealth_coins_log(child_id);
CREATE INDEX IF NOT EXISTS idx_wcl_created    ON wealth_coins_log(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wcl_event_type ON wealth_coins_log(event_type);

ALTER TABLE wealth_coins_log ENABLE ROW LEVEL SECURITY;

-- Parent can view wallet history for their children
CREATE POLICY "wcl_parent_read" ON wealth_coins_log
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client write â€” service_role only


-- â”€â”€â”€ 2. weekly_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Admin-created time-limited challenges.
-- Example: "Quiz Blitz Weekend â€” complete 3 quizzes for 150 bonus coins"
CREATE TABLE IF NOT EXISTS weekly_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  event_type   TEXT        NOT NULL DEFAULT 'challenge'
                           CHECK (event_type IN ('challenge', 'bonus', 'competition')),
  reward_coins INTEGER     NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  school_id    INTEGER     REFERENCES schools(id) ON DELETE SET NULL,  -- optional topic tie-in
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_we_active     ON weekly_events(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_we_school     ON weekly_events(school_id);

ALTER TABLE weekly_events ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active events (no sensitive data)
CREATE POLICY "we_authenticated_read" ON weekly_events
  FOR SELECT USING (auth.role() = 'authenticated');
-- NO client write â€” admin-created via service_role only


-- â”€â”€â”€ 3. weekly_event_completions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per (child, event) pair. The UNIQUE constraint makes
-- this idempotent â€” safe to call multiple times.
CREATE TABLE IF NOT EXISTS weekly_event_completions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES weekly_events(id) ON DELETE CASCADE,
  child_id      UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  coins_awarded INTEGER     NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_wec_child ON weekly_event_completions(child_id);
CREATE INDEX IF NOT EXISTS idx_wec_event ON weekly_event_completions(event_id);

ALTER TABLE weekly_event_completions ENABLE ROW LEVEL SECURITY;

-- Parent can read completions for their children
CREATE POLICY "wec_parent_read" ON weekly_event_completions
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client write â€” service_role only


-- â”€â”€â”€ 4. virtual_portfolio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Current simulated stock positions per child.
-- One row per (child, symbol) â€” updated on each buy/sell.
CREATE TABLE IF NOT EXISTS virtual_portfolio (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID          NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  symbol          TEXT          NOT NULL,
  company_name    TEXT          NOT NULL,
  shares_owned    NUMERIC(12,4) NOT NULL DEFAULT 0   CHECK (shares_owned >= 0),
  avg_cost_basis  NUMERIC(14,4) NOT NULL DEFAULT 0   CHECK (avg_cost_basis >= 0),  -- per share
  total_invested  NUMERIC(14,2) NOT NULL DEFAULT 0   CHECK (total_invested >= 0),  -- in virtual USD
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_vp_child  ON virtual_portfolio(child_id);
CREATE INDEX IF NOT EXISTS idx_vp_symbol ON virtual_portfolio(symbol);

ALTER TABLE virtual_portfolio ENABLE ROW LEVEL SECURITY;

-- Parent can read their child's portfolio
CREATE POLICY "vp_parent_read" ON virtual_portfolio
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client write â€” service_role only


-- â”€â”€â”€ 5. virtual_trades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Immutable trade ledger. Never updated â€” only appended.
-- Supports a full trade history view and P&L calculation.
CREATE TABLE IF NOT EXISTS virtual_trades (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID          NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  symbol       TEXT          NOT NULL,
  company_name TEXT          NOT NULL,
  trade_type   TEXT          NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  shares       NUMERIC(12,4) NOT NULL CHECK (shares > 0),
  price        NUMERIC(14,4) NOT NULL CHECK (price > 0),  -- simulated price at trade time
  total_value  NUMERIC(14,2) GENERATED ALWAYS AS (shares * price) STORED,
  notes        TEXT,
  traded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vt_child  ON virtual_trades(child_id, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vt_symbol ON virtual_trades(symbol);

ALTER TABLE virtual_trades ENABLE ROW LEVEL SECURITY;

-- Parent can read the full trade ledger for their children
CREATE POLICY "vt_parent_read" ON virtual_trades
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
-- NO client write â€” service_role only
