-- ── 005_store.sql ─────────────────────────────────────────────────────────
-- Coin packs, store items, item ownership, coin purchase log,
-- and monthly premium bonus idempotency table.
-- All writes happen through the backend service-role client.
-- Clients get SELECT-only access to their own rows.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Coin packs (static config — seeded here) ─────────────────────────────
CREATE TABLE IF NOT EXISTS coin_packs (
  id           SERIAL PRIMARY KEY,
  name         TEXT         NOT NULL,
  coins        INTEGER      NOT NULL CHECK (coins > 0),
  price_usd    NUMERIC(8,2) NOT NULL,
  badge_label  TEXT,          -- 'Popular' | 'Best Value' | NULL
  order_number INTEGER      NOT NULL DEFAULT 0
);

INSERT INTO coin_packs (name, coins, price_usd, badge_label, order_number) VALUES
  ('Starter',    300,   2.99, NULL,         1),
  ('Popular',    850,   7.99, 'Popular',    2),
  ('Best Value', 2200, 17.99, 'Best Value', 3),
  ('Mega',       5500, 44.99, NULL,         4)
ON CONFLICT DO NOTHING;

-- Public read — no sensitive data
ALTER TABLE coin_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read coin packs"
  ON coin_packs FOR SELECT USING (true);

-- ── Store items (static config — seeded here) ─────────────────────────────
CREATE TABLE IF NOT EXISTS store_items (
  id           SERIAL  PRIMARY KEY,
  name         TEXT    NOT NULL,
  description  TEXT    NOT NULL,
  icon         TEXT    NOT NULL,
  coin_cost    INTEGER NOT NULL CHECK (coin_cost >= 0),
  feature_key  TEXT    NOT NULL UNIQUE,  -- used by the app to launch the right screen
  order_number INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO store_items (name, description, icon, coin_cost, feature_key, order_number) VALUES
  ('Budget Tracker',
   'Connect your bank, Venmo, Zelle & Cash App to track all spending in one place.',
   '🏦', 750,  'budget_tracker',     1),

  ('Custom Themes & Avatars',
   'Personalise your profile with exclusive colour themes and character avatars.',
   '🎨', 300,  'custom_themes',      2),

  ('Study Timer + Pomodoro',
   'Beat procrastination with a built-in Pomodoro timer and focus-session tracker.',
   '⏱️', 450,  'study_timer',        3),

  ('Finance Goal Planner',
   'Set savings targets, track milestones, and celebrate when you hit your goals.',
   '🎯', 550,  'goal_planner',       4),

  ('Ad Removal',
   'Remove all ads from the app for a completely distraction-free learning experience.',
   '🚫', 650,  'ad_removal',         5),

  ('Advanced Analytics',
   'Unlock deep charts and insights on spending, savings rate, and financial habits.',
   '📊', 850,  'analytics',          6),

  ('School Skip',
   'Skip one school and jump straight to the next — use wisely, there is only one!',
   '⚡', 950,  'school_skip',        7),

  ('Premium Productivity Suite',
   'All study tools in one: goal planner, timer, habit tracker, and finance journal.',
   '💼', 1200, 'productivity_suite', 8),

  ('Lifetime VIP Badge',
   'A permanent gold badge next to your name — show the world you are a WealthWise legend.',
   '👑', 1500, 'vip_badge',          9)
ON CONFLICT (feature_key) DO NOTHING;

-- Public read — item definitions are not sensitive
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read store items"
  ON store_items FOR SELECT USING (true);

-- ── Item ownership (permanent, one row per child × item) ──────────────────
CREATE TABLE IF NOT EXISTS item_purchases (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  item_id      INTEGER     NOT NULL REFERENCES store_items(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, item_id)   -- UNIQUE constraint prevents double-purchase under concurrency
);

ALTER TABLE item_purchases ENABLE ROW LEVEL SECURITY;

-- Children (via their parent) can read their own purchases
CREATE POLICY "parent can read own child item purchases"
  ON item_purchases FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM child_profiles WHERE parent_id = auth.uid()
    )
  );
-- No INSERT/UPDATE policy — only the service-role backend can write here

-- ── Coin pack purchase log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coin_pack_purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id          UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  pack_id           INTEGER     NOT NULL REFERENCES coin_packs(id),
  coins_granted     INTEGER     NOT NULL,
  stripe_payment_id TEXT        UNIQUE,   -- idempotency: one row per Stripe payment_intent
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coin_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can view own coin pack purchases"
  ON coin_pack_purchases FOR SELECT
  USING (user_id = auth.uid());

-- ── Monthly premium bonus log ──────────────────────────────────────────────
-- Prevents awarding the 150-coin monthly bonus more than once per child per month.
CREATE TABLE IF NOT EXISTS monthly_bonus_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  month_key  TEXT        NOT NULL,    -- format: 'YYYY-MM', e.g. '2026-04'
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, month_key)        -- idempotency key
);

ALTER TABLE monthly_bonus_log ENABLE ROW LEVEL SECURITY;
-- No client read needed — server-only table
