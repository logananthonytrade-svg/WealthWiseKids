-- Migration 003: Version 2.0 tables
-- weekly_events, virtual_portfolio, wealth_coins_log

-- ─── Coin transaction log ─────────────────────────────────────
-- Records every earn/spend event so the Earn tab can show history
create table if not exists wealth_coins_log (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  coins       integer not null,          -- positive = earned, negative = spent
  reason      text    not null,          -- human-readable label
  created_at  timestamptz default now()
);

create index if not exists idx_coins_log_child on wealth_coins_log(child_id, created_at desc);

-- ─── Weekly events ────────────────────────────────────────────
-- Seeded manually or via admin panel; app reads active ones
create table if not exists weekly_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  type         text not null default 'quiz',  -- quiz | challenge | streak | market
  reward_coins integer not null default 100,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create index if not exists idx_weekly_events_active on weekly_events(ends_at) where is_active = true;

-- Track which children have claimed a weekly event reward
create table if not exists weekly_event_completions (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references weekly_events(id) on delete cascade,
  child_id     uuid not null references children(id) on delete cascade,
  completed_at timestamptz default now(),
  unique (event_id, child_id)
);

-- ─── Virtual investment portfolio ────────────────────────────
-- Holds virtual positions purchased with WealthCoins
create table if not exists virtual_portfolio (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  symbol     text not null,              -- e.g. 'AAPL', 'BTC', 'RE_NYC'
  shares     numeric(18,6) not null default 0,
  avg_cost   numeric(18,4) not null default 0,  -- coins per share at purchase
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (child_id, symbol)
);

create index if not exists idx_portfolio_child on virtual_portfolio(child_id);

-- ─── RLS policies ─────────────────────────────────────────────

-- wealth_coins_log: child can read their own rows; insert controlled via backend
alter table wealth_coins_log enable row level security;
create policy "Child reads own log" on wealth_coins_log
  for select using (
    child_id in (
      select id from children where parent_id = auth.uid()
        or id = (select id from children where id = child_id limit 1)
    )
  );

-- weekly_events: public read for active events
alter table weekly_events enable row level security;
create policy "Anyone can read active events" on weekly_events
  for select using (is_active = true and ends_at > now());

-- weekly_event_completions: child/parent can read; insert via backend
alter table weekly_event_completions enable row level security;

-- virtual_portfolio: users can read their own; mutations via client (coin-locked)
alter table virtual_portfolio enable row level security;
create policy "Child reads own portfolio" on virtual_portfolio
  for select using (
    child_id in (select id from children where parent_id = auth.uid())
  );
create policy "Child manages own portfolio" on virtual_portfolio
  for all using (
    child_id in (select id from children where parent_id = auth.uid())
  );

-- ─── Seed sample weekly event ─────────────────────────────────
insert into weekly_events (title, description, type, reward_coins, ends_at)
values (
  'Trivia Thursday 🎉',
  'Answer 5 financial literacy questions correctly to earn bonus WealthCoins!',
  'quiz',
  150,
  (now() + interval '7 days')
)
on conflict do nothing;
