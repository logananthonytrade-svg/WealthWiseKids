-- ============================================================
-- WealthWise Kids — Comprehensive Badge Definitions
-- Run AFTER 007_budget_tracker_rls.sql
--
-- 1. Unique constraint on badges.name (makes re-runs safe)
-- 2. Fix student_badges_write RLS (parent-session model fix)
-- 3. Full badge catalogue — every achievable milestone
-- ============================================================

-- ── 1. Unique constraint so ON CONFLICT (name) works ─────────
ALTER TABLE badges
  ADD CONSTRAINT IF NOT EXISTS badges_name_unique UNIQUE (name);

-- ── 2. Fix student_badges_write — parent-session model ───────
--    Old policy: child_id = auth.uid() → always fails because
--    auth.uid() is the PARENT's UUID, not the child's UUID.
DROP POLICY IF EXISTS "student_badges_write" ON student_badges;

CREATE POLICY "student_badges_write" ON student_badges
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- ── 3. Badge catalogue ────────────────────────────────────────
-- trigger_type reference:
--   lesson_complete   value = total completed count
--   school_complete   value = school_id
--   all_schools_complete  value = NULL
--   quiz_perfect      value = NULL (any perfect score)
--   quiz_perfect_count value = cumulative count of perfect scores
--   streak            value = current streak length
--   coins_total       value = lifetime coins earned threshold
--   budget_entry      value = total manual entries count
--   savings_entry     value = total savings-category entries count
--   bank_connected    value = NULL
--   profile_complete  value = NULL

INSERT INTO badges (name, description, icon_name, rarity, trigger_type, trigger_value) VALUES

-- ── LESSON MILESTONES ─────────────────────────────────────────
('First Steps',       'Completed your very first lesson.',                               '👟', 'common', 'lesson_complete',      '1'),
('Triple Threat',     'Completed 3 lessons. You''re on a roll!',                         '🌟', 'common', 'lesson_complete',      '3'),
('High Five',         'Completed 5 lessons. Halfway to ten!',                            '✋', 'common', 'lesson_complete',      '5'),
('Perfect Ten',       'Completed 10 lessons. Double digits!',                            '🔟', 'common', 'lesson_complete',      '10'),
('Lesson Pro',        'Completed 15 lessons. You''re getting serious.',                  '📖', 'rare',   'lesson_complete',      '15'),
('Twenty Strong',     'Completed 20 lessons. Committed learner!',                        '💪', 'rare',   'lesson_complete',      '20'),
('Knowledge Master',  'Completed 25 lessons. You know your stuff.',                      '🧠', 'epic',   'lesson_complete',      '25'),
('Lesson Legend',     'Completed 50 lessons. Legendary dedication.',                     '🏛️', 'epic',   'lesson_complete',      '50'),

-- ── SCHOOL GRADUATION ─────────────────────────────────────────
('School 1 Graduate', 'Completed all 7 lessons in Money Fundamentals.',                  '🎓', 'rare',   'school_complete',      '1'),
('Bank Expert',       'Completed all 7 lessons in Banking 101.',                         '🏦', 'rare',   'school_complete',      '2'),
('Investor',          'Completed the Investing Basics school.',                          '📈', 'epic',   'school_complete',      '3'),
('Market Master',     'Completed the Stock Market school.',                              '📊', 'epic',   'school_complete',      '4'),
('Money Maverick',    'Completed every school on WealthWise. Ultimate achievement!',     '🦁', 'epic',   'all_schools_complete', NULL),

-- ── QUIZ EXCELLENCE ───────────────────────────────────────────
('Quiz Champion',     'Scored 100% on any quiz.',                                        '🏆', 'rare',   'quiz_perfect',         NULL),
('Sharp Mind',        'Scored 100% on 3 separate quizzes.',                              '🎯', 'rare',   'quiz_perfect_count',   '3'),
('Quiz Elite',        'Scored 100% on 5 separate quizzes.',                              '⚔️', 'epic',   'quiz_perfect_count',   '5'),
('Untouchable',       'Scored 100% on 10 separate quizzes. Flawless.',                   '👑', 'epic',   'quiz_perfect_count',   '10'),

-- ── STREAK MILESTONES ─────────────────────────────────────────
('3-Day Grind',       'Studied 3 days in a row. Good habit forming!',                   '🔥', 'common', 'streak',               '3'),
('7-Day Streak',      'Studied for 7 days in a row without missing a day.',             '🔥', 'rare',   'streak',               '7'),
('Two Weeks Strong',  'Studied 14 days in a row. Commitment level: high.',               '🔥', 'rare',   'streak',               '14'),
('Three Week Warrior','21 days straight. Three full weeks of learning!',                 '⚡', 'rare',   'streak',               '21'),
('Month Streak',      'Studied every day for 30 days. Incredible habit.',                '🌕', 'epic',   'streak',               '30'),
('Two-Month Streak',  '60 days without a break. You''re unstoppable.',                   '🌟', 'epic',   'streak',               '60'),
('100-Day Warrior',   '100 days of consistent learning. Hall of fame.',                  '💎', 'epic',   'streak',               '100'),

-- ── COIN MILESTONES ───────────────────────────────────────────
('Pocket Change',     'Earned your first 100 WealthCoins.',                              '🪙', 'common', 'coins_total',          '100'),
('Growing Stash',     'Earned 250 WealthCoins. Saving up!',                              '💵', 'common', 'coins_total',          '250'),
('Coin Collector',    'Earned 500 WealthCoins total.',                                   '💰', 'rare',   'coins_total',          '500'),
('Big Earner',        'Earned 1,000 WealthCoins. Four digits!',                          '💳', 'rare',   'coins_total',          '1000'),
('Coin Hoarder',      'Earned 2,500 WealthCoins. You never stop.',                       '🏦', 'rare',   'coins_total',          '2500'),
('Coin King',         'Earned 5,000 WealthCoins. Royalty.',                              '👑', 'epic',   'coins_total',          '5000'),
('Coin Emperor',      'Earned 10,000 WealthCoins. The pinnacle.',                        '🏆', 'epic',   'coins_total',          '10000'),

-- ── SPEED / VOLUME ────────────────────────────────────────────
('Speed Learner',     'Completed 3 lessons in a single day.',                            '⚡', 'common', 'lessons_in_day',       '3'),
('Marathon Day',      'Completed 5 lessons in a single day.',                            '🏃', 'rare',   'lessons_in_day',       '5'),

-- ── BUDGET TRACKER ────────────────────────────────────────────
('Budget Starter',    'Added your first manual budget entry.',                           '📋', 'common', 'budget_entry',         '1'),
('Budget Builder',    'Added 10 budget entries. Building great habits!',                 '📊', 'common', 'budget_entry',         '10'),
('Budget Boss',       'Added 30 budget entries. You''re tracking everything.',           '💼', 'rare',   'budget_entry',         '30'),
('Budget Master',     'Added 100 budget entries. Ultimate tracking.',                    '🗂️', 'epic',   'budget_entry',         '100'),

-- ── SAVING HABITS ─────────────────────────────────────────────
('First Saver',       'Made your first savings entry in the Budget Tracker.',            '🐷', 'common', 'savings_entry',        '1'),
('Consistent Saver',  'Logged savings 5 separate times. Great habit!',                   '💰', 'common', 'savings_entry',        '5'),
('Saver',             'Logged savings 15 times. Money is safe!',                         '🏦', 'rare',   'savings_entry',        '15'),
('Super Saver',       'Logged savings 30 times. Savings superstar.',                     '🌟', 'epic',   'savings_entry',        '30'),

-- ── BANK CONNECTION ──────────────────────────────────────────
('Bank Linker',       'Connected your first real bank account.',                         '🏦', 'common', 'bank_connected',       NULL),

-- ── PROFILE ───────────────────────────────────────────────────
('All About Me',      'Completed your profile.',                                         '👤', 'common', 'profile_complete',     NULL)

ON CONFLICT (name) DO NOTHING;
