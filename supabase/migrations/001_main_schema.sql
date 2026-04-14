-- ============================================================
-- WealthWise Kids — Main Schema  (17 tables + RLS + seed data)
-- ============================================================

-- Drop policies so this script is safe to re-run
DO $$ BEGIN
  -- profiles
  DROP POLICY IF EXISTS "profiles_own" ON profiles;
  -- child_profiles
  DROP POLICY IF EXISTS "child_profiles_parent" ON child_profiles;
  DROP POLICY IF EXISTS "child_profiles_self" ON child_profiles;
  -- parental_consents
  DROP POLICY IF EXISTS "consents_parent" ON parental_consents;
  -- subscriptions
  DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
  -- schools
  DROP POLICY IF EXISTS "schools_public_read" ON schools;
  -- lessons
  DROP POLICY IF EXISTS "lessons_public_read" ON lessons;
  -- quiz_questions
  DROP POLICY IF EXISTS "quiz_public_read" ON quiz_questions;
  -- student_progress
  DROP POLICY IF EXISTS "progress_child" ON student_progress;
  DROP POLICY IF EXISTS "progress_parent" ON student_progress;
  DROP POLICY IF EXISTS "progress_child_write" ON student_progress;
  DROP POLICY IF EXISTS "progress_child_update" ON student_progress;
  -- quiz_attempts
  DROP POLICY IF EXISTS "attempts_child" ON quiz_attempts;
  DROP POLICY IF EXISTS "attempts_parent" ON quiz_attempts;
  DROP POLICY IF EXISTS "attempts_child_write" ON quiz_attempts;
  -- badges
  DROP POLICY IF EXISTS "badges_public_read" ON badges;
  -- student_badges
  DROP POLICY IF EXISTS "student_badges_child" ON student_badges;
  DROP POLICY IF EXISTS "student_badges_parent" ON student_badges;
  DROP POLICY IF EXISTS "student_badges_write" ON student_badges;
  -- wealth_coins
  DROP POLICY IF EXISTS "coins_child" ON wealth_coins;
  DROP POLICY IF EXISTS "coins_parent" ON wealth_coins;
  DROP POLICY IF EXISTS "coins_child_write" ON wealth_coins;
  -- coin_transactions
  DROP POLICY IF EXISTS "coin_tx_child" ON coin_transactions;
  DROP POLICY IF EXISTS "coin_tx_write" ON coin_transactions;
  -- streaks
  DROP POLICY IF EXISTS "streaks_child" ON streaks;
  DROP POLICY IF EXISTS "streaks_parent" ON streaks;
  DROP POLICY IF EXISTS "streaks_write" ON streaks;
  -- budget_entries
  DROP POLICY IF EXISTS "budget_child" ON budget_entries;
  DROP POLICY IF EXISTS "budget_parent" ON budget_entries;
  -- plaid_connections
  DROP POLICY IF EXISTS "plaid_parent_only" ON plaid_connections;
  -- saving_goals
  DROP POLICY IF EXISTS "goals_child" ON saving_goals;
  DROP POLICY IF EXISTS "goals_parent" ON saving_goals;
EXCEPTION WHEN OTHERS THEN NULL; -- tables may not exist yet, that's fine
END $$;

-- ─── 1. profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  account_type  TEXT NOT NULL DEFAULT 'parent' CHECK (account_type IN ('parent','child')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, account_type)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'parent')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. child_profiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  birthdate      DATE NOT NULL,
  avatar_choice  INTEGER NOT NULL DEFAULT 1 CHECK (avatar_choice BETWEEN 1 AND 10),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_child_profiles_parent ON child_profiles(parent_id);
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
-- Parent can manage their own children
CREATE POLICY "child_profiles_parent" ON child_profiles
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());
-- Child can read their own record (their profile.id matches child_profiles.id)
CREATE POLICY "child_profiles_self" ON child_profiles
  FOR SELECT USING (id = auth.uid());

-- ─── 3. parental_consents ────────────────────────────────────
CREATE TABLE IF NOT EXISTS parental_consents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id           UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  consent_given      BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_parent" ON parental_consents
  USING (parent_id = auth.uid());

-- ─── 4. subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type               TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','premium','family')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- ─── 5. schools ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  order_number  INTEGER NOT NULL,
  icon_name     TEXT NOT NULL DEFAULT '💰',
  is_premium    BOOLEAN NOT NULL DEFAULT FALSE,
  min_age       INTEGER NOT NULL DEFAULT 8,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools_public_read" ON schools FOR SELECT USING (TRUE);

-- ─── 6. lessons ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  lesson_number  INTEGER NOT NULL,
  lesson_type    TEXT NOT NULL DEFAULT 'content' CHECK (lesson_type IN ('content','did_you_know','activity')),
  fun_fact       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, lesson_number)
);
CREATE INDEX IF NOT EXISTS idx_lessons_school ON lessons(school_id, lesson_number);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_public_read" ON lessons FOR SELECT USING (TRUE);

-- ─── 7. quiz_questions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice','true_false','fill_blank')),
  options         JSONB,
  correct_answer  TEXT NOT NULL,
  explanation     TEXT NOT NULL DEFAULT '',
  difficulty      TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  order_number    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quiz_school ON quiz_questions(school_id);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_public_read" ON quiz_questions FOR SELECT USING (TRUE);

-- ─── 8. student_progress ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  school_id     INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_child ON student_progress(child_id, school_id);
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_child" ON student_progress
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "progress_parent" ON student_progress
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
CREATE POLICY "progress_child_write" ON student_progress
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "progress_child_update" ON student_progress
  FOR UPDATE USING (child_id = auth.uid());

-- ─── 9. quiz_attempts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  score               INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed              BOOLEAN NOT NULL DEFAULT FALSE,
  answers             JSONB,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken_seconds  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_attempts_child ON quiz_attempts(child_id, school_id);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_child" ON quiz_attempts
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "attempts_parent" ON quiz_attempts
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
CREATE POLICY "attempts_child_write" ON quiz_attempts
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- ─── 10. badges ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  icon_name      TEXT NOT NULL DEFAULT '🏅',
  rarity         TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic')),
  trigger_type   TEXT NOT NULL,
  trigger_value  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (TRUE);

-- ─── 11. student_badges ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_student_badges_child ON student_badges(child_id);
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_badges_child" ON student_badges
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "student_badges_parent" ON student_badges
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
CREATE POLICY "student_badges_write" ON student_badges
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- ─── 12. wealth_coins ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wealth_coins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL UNIQUE REFERENCES child_profiles(id) ON DELETE CASCADE,
  balance       INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE wealth_coins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coins_child" ON wealth_coins
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "coins_parent" ON wealth_coins
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
CREATE POLICY "coins_child_write" ON wealth_coins
  FOR ALL USING (child_id = auth.uid());

-- ─── 13. coin_transactions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS coin_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coin_tx_child ON coin_transactions(child_id);
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_tx_child" ON coin_transactions
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "coin_tx_write" ON coin_transactions
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- ─── 14. streaks ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            UUID NOT NULL UNIQUE REFERENCES child_profiles(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_activity_date  DATE,
  freeze_available    BOOLEAN NOT NULL DEFAULT TRUE,
  last_freeze_used    DATE
);
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_child" ON streaks
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "streaks_parent" ON streaks
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );
CREATE POLICY "streaks_write" ON streaks
  FOR ALL USING (child_id = auth.uid());

-- ─── 15. budget_entries ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id              UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  entry_type            TEXT NOT NULL CHECK (entry_type IN ('income','expense')),
  amount                NUMERIC NOT NULL CHECK (amount > 0),
  category              TEXT NOT NULL DEFAULT 'other',
  description           TEXT,
  entry_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  is_from_plaid         BOOLEAN NOT NULL DEFAULT FALSE,
  plaid_transaction_id  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budget_child ON budget_entries(child_id, entry_date DESC);
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_child" ON budget_entries
  USING (child_id = auth.uid())
  WITH CHECK (child_id = auth.uid());
CREATE POLICY "budget_parent" ON budget_entries
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- ─── 16. plaid_connections ───────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_connections (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id                 UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  access_token_encrypted   TEXT NOT NULL,
  item_id                  TEXT NOT NULL,
  institution_name         TEXT,
  last_synced              TIMESTAMPTZ,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;
-- Only the parent of the child can access Plaid connections
CREATE POLICY "plaid_parent_only" ON plaid_connections
  USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- ─── 17. saving_goals ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saving_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  target_amount   NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  icon_emoji      TEXT NOT NULL DEFAULT '🎯',
  target_date     DATE,
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_child" ON saving_goals
  USING (child_id = auth.uid())
  WITH CHECK (child_id = auth.uid());
CREATE POLICY "goals_parent" ON saving_goals
  FOR SELECT USING (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- ============================================================
-- SEED DATA
-- ============================================================

-- Schools
INSERT INTO schools (id, title, description, order_number, icon_name, is_premium, min_age) VALUES
  (1, 'Money Fundamentals',    'Learn what money is, where it comes from, and how to use it wisely.',           1, '💰', FALSE, 8),
  (2, 'Banking & Budgeting',   'Understand banks, savings accounts, budgets, and how money moves.',            2, '🏦', TRUE,  10),
  (3, 'Investing Basics',      'Discover stocks, compound interest, and how money can grow over time.',        3, '📈', TRUE,  12),
  (4, 'Taxes & Income',        'Learn how taxes work, why they exist, and how paychecks are calculated.',      4, '🧾', TRUE,  14),
  (5, 'Entrepreneurship',      'Build a business idea, learn about profit, loss, and growing a company.',      5, '🚀', TRUE,  12)
ON CONFLICT (id) DO NOTHING;

-- School 1 Lessons (7 lessons)
-- Remove any duplicates from aborted runs before inserting
DELETE FROM lessons l1 USING lessons l2
  WHERE l1.id > l2.id AND l1.school_id = l2.school_id AND l1.lesson_number = l2.lesson_number;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_school_id_lesson_number_key;
ALTER TABLE lessons ADD CONSTRAINT lessons_school_id_lesson_number_key UNIQUE (school_id, lesson_number);
INSERT INTO lessons (school_id, title, content, lesson_number, lesson_type, fun_fact) VALUES
(1,
 'What Is Money?',
 'Money is a tool that people invented to make trading easier. Long ago, people traded goods directly — you might trade three fish for a pair of sandals. But what if you had fish and needed shoes, but the shoemaker did not want fish?

Money solved this problem. Money is something everyone agrees has value. It can be paper bills, metal coins, or even numbers in a computer. As long as everyone accepts it, money works.

Today, most money exists as digital numbers in bank accounts. When you buy something online, numbers just move from one account to another.

KEY CONCEPT: Money has three jobs:
1. A medium of exchange — you trade it for things
2. A store of value — you can save it for later
3. A unit of account — you use it to compare prices',
 1, 'content',
 'The earliest known money was shells called cowries, used 3,000 years ago in China. Before coins were invented, people carried bags of cowrie shells to the market!'),

(1,
 'Earning Money',
 'Money does not appear from nowhere — it comes from providing value to others. The most common way people earn money is through a job. You give your time and skill to an employer, and they pay you.

HOW WAGES WORK:
- Hourly pay: You earn a fixed amount for each hour you work. If you earn \$15/hour and work 8 hours, you earn \$120.
- Salary: A fixed amount per year, divided into regular paychecks.
- Commission: You earn a percentage of what you sell.

But working a job is not the only way to earn. You can also:
- Start a business and sell products or services
- Invest money and earn returns over time
- Create something (art, music, software) and earn from it repeatedly

IMPORTANT: Your earning power grows with your skills and knowledge. That is why what you learn now about money is so valuable — it increases what you can earn and keep forever.',
 2, 'content',
 'Warren Buffett earned his first dollar at age 6 by selling chewing gum door-to-door in his neighborhood. By age 11, he had already bought his first stock.'),

(1,
 'Spending Wisely',
 'Getting money is only half the challenge. What you do with it matters even more.

THE BIG MISTAKE most people make is spending money without thinking. They see something they want, they buy it, and later feel regret. This is called impulse buying.

SPENDING WISELY means asking three questions before you spend:
1. Do I need this, or do I want this?
2. Could I get the same thing cheaper somewhere else?
3. If I spend this, what will I have to give up?

That last question is called an opportunity cost — every dollar you spend is a dollar you cannot spend on something else.

NEEDS vs WANTS:
Needs are things you must have — food, shelter, clothing, transportation to school or work.
Wants are everything else. Wants are not bad, but they should come AFTER needs are covered.

THE TRICK: Pause 24 hours before any purchase over \$20. Most of the time, the urge passes.',
 3, 'content',
 'The average American spends \$18,000 per year on non-essential purchases. Over a lifetime, that adds up to over \$1 million dollars spent on things that were "wants" not "needs."'),

(1,
 'Saving: Your Financial Foundation',
 'Saving money is the most important habit you can build. It is the foundation of everything else — investing, starting a business, handling emergencies, achieving goals.

THE GOLDEN RULE: Pay yourself first.
Before you spend a single dollar on anything, set aside money for savings. Aim for at least 20% of any money you receive.

If you get \$50 for your birthday: Move \$10 to savings immediately, before buying anything.
If you earn \$100 doing yard work: Save \$20 before you spend anything.

WHY SAVING IS HARD: Our brains are wired to prefer rewards right now over rewards later. This is called present bias. Knowing this is the first step to overcoming it.

COMPOUND INTEREST: When you save money in a bank account, the bank pays you interest — a small percentage for keeping your money there. Then you earn interest on that interest. Over decades, this can turn small savings into enormous amounts.

Example: If you save \$100/month starting at age 15, with 7% annual growth, you will have over \$525,000 by age 65. The same \$100/month starting at age 25 only grows to \$262,000. Starting early DOUBLES your result.',
 4, 'content',
 'If you saved just \$1 a day starting at age 10, by the time you were 65 you would have saved \$20,075 — but with compound interest, it would have grown to over \$200,000!'),

(1,
 'Budgeting: Your Money Plan',
 'A budget is simply a plan for your money. Without a plan, money tends to disappear without much to show for it.

THE 50/30/20 RULE is a simple budgeting framework:
- 50% for Needs (food, rent, transportation, necessities)
- 30% for Wants (entertainment, dining out, hobbies)
- 20% for Savings and investments

For kids and teens managing allowance or part-time job income, a simpler version works great:
- 60% Spending (things you need and want now)
- 20% Saving (medium-term goals — a new game, a trip, a car someday)
- 20% Investing or donating (long-term wealth or helping others)

HOW TO MAKE A BUDGET:
Step 1: Write down all money coming in (income)
Step 2: Write down all money going out (expenses)
Step 3: Compare the two — are you spending more than you earn?
Step 4: Adjust until your expenses are less than your income

A budget is not a prison. It is freedom — it tells you exactly how much you can spend on fun things without guilt.',
 5, 'content',
 'The word "budget" comes from the French word "bougette" meaning small leather bag — the bag where medieval merchants kept their coins to track daily spending.'),

(1,
 'Banks and Your Money',
 'Banks are businesses that hold money for people and businesses. They play a central role in the economy.

WHAT A BANK DOES FOR YOU:
- Keeps your money safe (much safer than cash at home)
- Gives you easy access via debit cards and ATMs
- Pays you interest on savings accounts
- Provides loans when you need to borrow

ACCOUNT TYPES:
Checking account: For everyday spending. You can deposit money and spend it with a debit card or write checks. Usually pays little or no interest.

Savings account: For money you want to keep. Higher interest rates, but typically limits how often you can withdraw.

FDIC Insurance: In the United States, bank accounts are insured up to \$250,000 per person by the government. This means if a bank fails, the government guarantees your money is safe.

DEBIT vs CREDIT:
A debit card spends money you already have in your account.
A credit card borrows money from the bank — you must pay it back, often with interest if you carry a balance.

The most important rule of credit: never carry a balance. Pay it off completely every month.',
 6, 'content',
 'The world''s first bank was founded in Venice, Italy in 1157. It was primarily to finance wars! Today there are over 5,000 banks in the United States alone.'),

(1,
 'Setting Financial Goals',
 'People who achieve financial success almost always have written goals. A goal transforms a wish into a plan.

SMART FINANCIAL GOALS are:
- Specific: "Save \$500" not "save more money"
- Measurable: You can track progress with a number
- Achievable: Challenging but possible given your income
- Relevant: It matters to you personally
- Time-bound: You have a deadline

TYPES OF GOALS BY TIME:
Short-term (1 week to 1 year): New sneakers, a video game, a birthday gift for a friend.
Medium-term (1 to 5 years): A car, a laptop, a college fund contribution.
Long-term (5+ years): College education, a first apartment, retirement savings.

THE POWER OF AUTOMATION: Once you set a savings goal, make it automatic. Set up automatic transfers from your checking to savings on the day you get paid. When saving is automatic, you remove the willpower required to do it manually.

YOUR ASSIGNMENT: Write down three financial goals right now — one in each time category. Make them SMART. Then calculate how much you need to save each week to reach each one.',
 7, 'content',
 'Research shows that people who write down their goals are 42% more likely to achieve them than those who just think about their goals. The act of writing makes it real.')
ON CONFLICT (school_id, lesson_number) DO NOTHING;

-- School 1 Quiz Questions (10 questions)
INSERT INTO quiz_questions (school_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number) VALUES
(1, 
 'What are the THREE jobs of money?',
 'multiple_choice',
 '["Medium of exchange, store of value, unit of account", "Earning, spending, saving", "Coins, paper bills, digital numbers", "Income, expenses, profit"]'::jsonb,
 'Medium of exchange, store of value, unit of account',
 'Money serves three functions: it is used for trading (medium of exchange), can be saved for later (store of value), and lets us compare prices (unit of account).',
 'easy', 1),

(1,
 'What does "Pay yourself first" mean?',
 'multiple_choice',
 '["Pay your bills before spending on fun", "Save money before spending on anything else", "Pay the most important person in your life first", "Pay off debt before saving"]'::jsonb,
 'Save money before spending on anything else',
 'Paying yourself first means moving money to savings immediately when you receive it, before spending on anything — even necessities. It is the most powerful savings habit.',
 'easy', 2),

(1,
 'True or False: A debit card borrows money from the bank that you must pay back with interest.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'A debit card spends money you ALREADY HAVE in your bank account. A credit card borrows money that you must pay back — and you may owe interest if you do not pay the full balance each month.',
 'easy', 3),

(1,
 'Under the 50/30/20 budget rule, what percentage should go to SAVINGS?',
 'multiple_choice',
 '["10%", "20%", "30%", "50%"]'::jsonb,
 '20%',
 'The 50/30/20 rule splits your money: 50% for needs, 30% for wants, and 20% for savings and investments. The 20% savings portion is what builds long-term wealth.',
 'easy', 4),

(1,
 'What is an "opportunity cost"?',
 'multiple_choice',
 '["The cost of a missed opportunity at work", "What you give up when you choose to spend money one way instead of another", "Extra fees charged by a bank", "The cost of investing in stocks"]'::jsonb,
 'What you give up when you choose to spend money one way instead of another',
 'Every financial decision has an opportunity cost — the value of the next best alternative you gave up. If you spend \$50 on video games, the opportunity cost is what else that \$50 could have done (been saved, invested, etc.).',
 'medium', 5),

(1,
 'What is compound interest in simple terms?',
 'multiple_choice',
 '["Interest charged on your credit card", "Earning interest on your interest — your money grows faster over time", "A type of bank account with no fees", "Interest paid on a home mortgage"]'::jsonb,
 'Earning interest on your interest — your money grows faster over time',
 'Compound interest means you earn interest not just on your original savings, but also on all the interest you have already earned. Over long periods, this creates exponential growth.',
 'medium', 6),

(1,
 'True or False: In a savings account, your money earns interest.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'Banks pay you interest on savings accounts because they use your money (lending it to other customers). The interest rate is usually small but every bit helps — especially with compound interest over time.',
 'easy', 7),

(1,
 'If you save \$100/month starting at age 15 vs. starting at age 25, how does the result compare at age 65?',
 'multiple_choice',
 '["Both result in the same amount", "Starting at 15 earns about twice as much", "Starting at 25 earns more because interest rates improve", "The difference is only a few thousand dollars"]'::jsonb,
 'Starting at 15 earns about twice as much',
 'Due to compound interest, starting to save at 15 vs 25 results in roughly DOUBLE the final amount — not because of more savings, but because money has 10 extra years to grow. Time is your greatest financial asset.',
 'hard', 8),

(1,
 'What does FDIC insurance protect you from?',
 'multiple_choice',
 '["Thieves stealing your debit card", "Your bank failing and losing your deposits", "Stock market losses", "Credit card fraud"]'::jsonb,
 'Your bank failing and losing your deposits',
 'FDIC (Federal Deposit Insurance Corporation) insures up to \$250,000 per depositor if a bank fails. This is why keeping money in a bank is safer than keeping cash at home.',
 'medium', 9),

(1,
 'What makes a financial goal "SMART"?',
 'multiple_choice',
 '["Simple, Manageable, Adaptable, Reasonable, Timely", "Specific, Measurable, Achievable, Relevant, Time-bound", "Saved, Money, Allocated, Resources, Together", "Spending, Managing, Accounting, Reviewing, Tracking"]'::jsonb,
 'Specific, Measurable, Achievable, Relevant, Time-bound',
 'SMART is a goal-setting framework: Specific (clear and detailed), Measurable (trackable with numbers), Achievable (realistic), Relevant (matters to you), and Time-bound (has a deadline). Goals with all five qualities are far more likely to be achieved.',
 'medium', 10)
ON CONFLICT DO NOTHING;

-- Badges (MVP set)
INSERT INTO badges (name, description, icon_name, rarity, trigger_type, trigger_value) VALUES
('First Steps',       'Completed your very first lesson.',                              '👟', 'common', 'lesson_complete', '1'),
('School 1 Graduate', 'Completed all 7 lessons in Money Fundamentals.',                 '🎓', 'rare',   'school_complete',  '1'),
('Quiz Champion',     'Scored 100% on any quiz.',                                       '🏆', 'epic',   'quiz_perfect',     NULL),
('7-Day Streak',      'Studied for 7 days in a row without missing a day.',             '🔥', 'rare',   'streak',           '7'),
('Coin Collector',    'Earned 500 WealthCoins total.',                                  '💰', 'rare',   'coins_total',      '500'),
('Speed Learner',     'Completed 3 lessons in a single day.',                           '⚡', 'common', 'lessons_in_day',   '3'),
('Bank Expert',       'Completed the Banking & Budgeting school.',                      '🏦', 'rare',   'school_complete',  '2'),
('Investor',          'Completed the Investing Basics school.',                         '📈', 'epic',   'school_complete',  '3');

