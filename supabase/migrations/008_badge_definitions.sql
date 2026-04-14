-- Drop policies so this script is safe to re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "student_badges_write" ON student_badges;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- ============================================================
-- WealthWise Kids â€” Comprehensive Badge Definitions
-- Run AFTER 007_budget_tracker_rls.sql
--
-- 1. Unique constraint on badges.name (makes re-runs safe)
-- 2. Fix student_badges_write RLS (parent-session model fix)
-- 3. Full badge catalogue â€” every achievable milestone
-- ============================================================

-- â”€â”€ 1. Unique constraint so ON CONFLICT (name) works â”€â”€â”€â”€â”€â”€â”€â”€â”€
DO $$
BEGIN
  -- Remove pre-existing duplicate names so the unique constraint can be added.
  DELETE FROM badges b
  USING badges d
  WHERE b.name = d.name
    AND b.ctid > d.ctid;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'badges_name_unique'
      AND conrelid = 'badges'::regclass
  ) THEN
    ALTER TABLE badges
      ADD CONSTRAINT badges_name_unique UNIQUE (name);
  END IF;
END $$;

-- â”€â”€ 2. Fix student_badges_write â€” parent-session model â”€â”€â”€â”€â”€â”€â”€
--    Old policy: child_id = auth.uid() â†’ always fails because
--    auth.uid() is the PARENT's UUID, not the child's UUID.
DROP POLICY IF EXISTS "student_badges_write" ON student_badges;

CREATE POLICY "student_badges_write" ON student_badges
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM child_profiles WHERE parent_id = auth.uid())
  );

-- â”€â”€ 3. Badge catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ LESSON MILESTONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('First Steps',       'Completed your very first lesson.',                               'ðŸ‘Ÿ', 'common', 'lesson_complete',      '1'),
('Triple Threat',     'Completed 3 lessons. You''re on a roll!',                         'ðŸŒŸ', 'common', 'lesson_complete',      '3'),
('High Five',         'Completed 5 lessons. Halfway to ten!',                            'âœ‹', 'common', 'lesson_complete',      '5'),
('Perfect Ten',       'Completed 10 lessons. Double digits!',                            'ðŸ”Ÿ', 'common', 'lesson_complete',      '10'),
('Lesson Pro',        'Completed 15 lessons. You''re getting serious.',                  'ðŸ“–', 'rare',   'lesson_complete',      '15'),
('Twenty Strong',     'Completed 20 lessons. Committed learner!',                        'ðŸ’ª', 'rare',   'lesson_complete',      '20'),
('Knowledge Master',  'Completed 25 lessons. You know your stuff.',                      'ðŸ§ ', 'epic',   'lesson_complete',      '25'),
('Lesson Legend',     'Completed 50 lessons. Legendary dedication.',                     'ðŸ›ï¸', 'epic',   'lesson_complete',      '50'),

-- â”€â”€ SCHOOL GRADUATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('School 1 Graduate', 'Completed all 7 lessons in Money Fundamentals.',                  'ðŸŽ“', 'rare',   'school_complete',      '1'),
('Bank Expert',       'Completed all 7 lessons in Banking 101.',                         'ðŸ¦', 'rare',   'school_complete',      '2'),
('Investor',          'Completed the Investing Basics school.',                          'ðŸ“ˆ', 'epic',   'school_complete',      '3'),
('Market Master',     'Completed the Stock Market school.',                              'ðŸ“Š', 'epic',   'school_complete',      '4'),
('Money Maverick',    'Completed every school on WealthWise. Ultimate achievement!',     'ðŸ¦', 'epic',   'all_schools_complete', NULL),

-- â”€â”€ QUIZ EXCELLENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('Quiz Champion',     'Scored 100% on any quiz.',                                        'ðŸ†', 'rare',   'quiz_perfect',         NULL),
('Sharp Mind',        'Scored 100% on 3 separate quizzes.',                              'ðŸŽ¯', 'rare',   'quiz_perfect_count',   '3'),
('Quiz Elite',        'Scored 100% on 5 separate quizzes.',                              'âš”ï¸', 'epic',   'quiz_perfect_count',   '5'),
('Untouchable',       'Scored 100% on 10 separate quizzes. Flawless.',                   'ðŸ‘‘', 'epic',   'quiz_perfect_count',   '10'),

-- â”€â”€ STREAK MILESTONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('3-Day Grind',       'Studied 3 days in a row. Good habit forming!',                   'ðŸ”¥', 'common', 'streak',               '3'),
('7-Day Streak',      'Studied for 7 days in a row without missing a day.',             'ðŸ”¥', 'rare',   'streak',               '7'),
('Two Weeks Strong',  'Studied 14 days in a row. Commitment level: high.',               'ðŸ”¥', 'rare',   'streak',               '14'),
('Three Week Warrior','21 days straight. Three full weeks of learning!',                 'âš¡', 'rare',   'streak',               '21'),
('Month Streak',      'Studied every day for 30 days. Incredible habit.',                'ðŸŒ•', 'epic',   'streak',               '30'),
('Two-Month Streak',  '60 days without a break. You''re unstoppable.',                   'ðŸŒŸ', 'epic',   'streak',               '60'),
('100-Day Warrior',   '100 days of consistent learning. Hall of fame.',                  'ðŸ’Ž', 'epic',   'streak',               '100'),

-- â”€â”€ COIN MILESTONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('Pocket Change',     'Earned your first 100 WealthCoins.',                              'ðŸª™', 'common', 'coins_total',          '100'),
('Growing Stash',     'Earned 250 WealthCoins. Saving up!',                              'ðŸ’µ', 'common', 'coins_total',          '250'),
('Coin Collector',    'Earned 500 WealthCoins total.',                                   'ðŸ’°', 'rare',   'coins_total',          '500'),
('Big Earner',        'Earned 1,000 WealthCoins. Four digits!',                          'ðŸ’³', 'rare',   'coins_total',          '1000'),
('Coin Hoarder',      'Earned 2,500 WealthCoins. You never stop.',                       'ðŸ¦', 'rare',   'coins_total',          '2500'),
('Coin King',         'Earned 5,000 WealthCoins. Royalty.',                              'ðŸ‘‘', 'epic',   'coins_total',          '5000'),
('Coin Emperor',      'Earned 10,000 WealthCoins. The pinnacle.',                        'ðŸ†', 'epic',   'coins_total',          '10000'),

-- â”€â”€ SPEED / VOLUME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('Speed Learner',     'Completed 3 lessons in a single day.',                            'âš¡', 'common', 'lessons_in_day',       '3'),
('Marathon Day',      'Completed 5 lessons in a single day.',                            'ðŸƒ', 'rare',   'lessons_in_day',       '5'),

-- â”€â”€ BUDGET TRACKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('Budget Starter',    'Added your first manual budget entry.',                           'ðŸ“‹', 'common', 'budget_entry',         '1'),
('Budget Builder',    'Added 10 budget entries. Building great habits!',                 'ðŸ“Š', 'common', 'budget_entry',         '10'),
('Budget Boss',       'Added 30 budget entries. You''re tracking everything.',           'ðŸ’¼', 'rare',   'budget_entry',         '30'),
('Budget Master',     'Added 100 budget entries. Ultimate tracking.',                    'ðŸ—‚ï¸', 'epic',   'budget_entry',         '100'),

-- â”€â”€ SAVING HABITS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('First Saver',       'Made your first savings entry in the Budget Tracker.',            'ðŸ·', 'common', 'savings_entry',        '1'),
('Consistent Saver',  'Logged savings 5 separate times. Great habit!',                   'ðŸ’°', 'common', 'savings_entry',        '5'),
('Saver',             'Logged savings 15 times. Money is safe!',                         'ðŸ¦', 'rare',   'savings_entry',        '15'),
('Super Saver',       'Logged savings 30 times. Savings superstar.',                     'ðŸŒŸ', 'epic',   'savings_entry',        '30'),

-- â”€â”€ BANK CONNECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('Bank Linker',       'Connected your first real bank account.',                         'ðŸ¦', 'common', 'bank_connected',       NULL),

-- â”€â”€ PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
('All About Me',      'Completed your profile.',                                         'ðŸ‘¤', 'common', 'profile_complete',     NULL)

ON CONFLICT (name) DO NOTHING;
