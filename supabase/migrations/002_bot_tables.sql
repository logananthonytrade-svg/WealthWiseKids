-- ============================================================
-- WealthWise Kids — Bot / Trading Room tables
-- Run this in Supabase SQL Editor AFTER the main schema
-- ============================================================

-- bot_signals: every setup the bot identifies that passes all gates
CREATE TABLE IF NOT EXISTS bot_signals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol        TEXT NOT NULL,
    direction     TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    pattern       TEXT,          -- break_retest | double | flag_wedge
    entry_tf      TEXT,          -- 4h | 2h | 1h | 30m | 15m
    entry_price   NUMERIC,
    stop          NUMERIC,
    target        NUMERIC,
    rr            NUMERIC,
    ml_score      NUMERIC,       -- gate 6 probability (null if model not loaded)
    gates_passed  INTEGER DEFAULT 5,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bot_signals_symbol    ON bot_signals(symbol);
CREATE INDEX idx_bot_signals_created   ON bot_signals(created_at DESC);

-- RLS: anyone with a valid session can read signals (read-only)
ALTER TABLE bot_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_read" ON bot_signals FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────

-- bot_trades: paper and live trade lifecycle (open → closed)
CREATE TABLE IF NOT EXISTS bot_trades (
    trade_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id),   -- null = system paper trade
    symbol        TEXT NOT NULL,
    direction     TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    entry_price   NUMERIC NOT NULL,
    stop          NUMERIC NOT NULL,
    target        NUMERIC NOT NULL,
    exit_price    NUMERIC,
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','timeout')),
    pnl_r         NUMERIC,       -- result in R multiples (e.g. 2.1 or -1.0)
    entry_time    TIMESTAMPTZ DEFAULT NOW(),
    exit_time     TIMESTAMPTZ,
    notes         TEXT
);
CREATE INDEX idx_bot_trades_user    ON bot_trades(user_id);
CREATE INDEX idx_bot_trades_status  ON bot_trades(status);

ALTER TABLE bot_trades ENABLE ROW LEVEL SECURITY;
-- Authenticated users see their own trades + all system paper trades (user_id IS NULL)
CREATE POLICY "trades_read" ON bot_trades FOR SELECT
    USING (auth.role() = 'authenticated' AND (user_id = auth.uid() OR user_id IS NULL));

-- ─────────────────────────────────────────────────────────────────────────────

-- bot_status: single-row heartbeat written by bot_service.py
CREATE TABLE IF NOT EXISTS bot_status (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    mode        TEXT DEFAULT 'paper',
    watchlist   TEXT,            -- JSON array of symbols
    last_scan   TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE bot_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_read" ON bot_status FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial row so the app never hits an empty table
INSERT INTO bot_status (id, mode, watchlist, last_scan)
VALUES (1, 'paper', '["MES","ES","NQ","MNQ","ZN","GC","CL"]', NOW())
ON CONFLICT (id) DO NOTHING;
