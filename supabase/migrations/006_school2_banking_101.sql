-- ============================================================
-- WealthWise Kids — School 2: Banking 101
-- Run AFTER 005_store.sql
-- Adds:
--   • School 2 metadata (upsert-safe)
--   • 7 lessons with plain content + fun_fact
--   • Rich sections JSONB for all 7 lessons
--   • 3 per-lesson quiz questions (21 total, linked by lesson_id)
-- ============================================================

-- ─── Upsert School 2 Metadata ────────────────────────────────
INSERT INTO schools (id, title, description, order_number, icon_name, is_premium, min_age)
VALUES (
  2,
  'Banking 101',
  'Master checking vs savings, interest, debit cards, overdraft, fees, and how to build your first real banking system.',
  2,
  '🏦',
  TRUE,
  10
)
ON CONFLICT (id) DO UPDATE SET
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  order_number = EXCLUDED.order_number,
  icon_name    = EXCLUDED.icon_name,
  is_premium   = EXCLUDED.is_premium,
  min_age      = EXCLUDED.min_age;

-- ─── Delete any previous School 2 lessons + quiz questions ───
-- (idempotent — safe to re-run; cascades to quiz_questions via ON DELETE SET NULL)
DELETE FROM quiz_questions WHERE school_id = 2;
DELETE FROM lessons        WHERE school_id = 2;

-- ─── Insert 7 Lessons for School 2 ───────────────────────────
INSERT INTO lessons (school_id, title, content, lesson_number, lesson_type, fun_fact)
VALUES

(2,
 'Checking vs Savings – Two Accounts, Two Jobs',
 $body$A checking account and a savings account look almost identical — both live at your bank, both show up in the same app. But they have completely different jobs, and mixing them up is one of the most common — and expensive — teen banking mistakes.

Your checking account is your money's home base for daily life. You swipe your debit card at Chipotle. You Venmo your friend. You get your paycheck deposited here. It's built for constant movement — in, out, all day, every day.

Your savings account is the vault. It's where money lives when you don't want to touch it. The bank rewards you for leaving it alone by paying you interest — a percentage of your balance just for keeping it there.

The golden rule: checking is for spending, savings is for growing. When you blur that line, spending money from your savings "just this once," you chip away at the habit that creates wealth.

Most online banks now let you open both accounts in 10 minutes on your phone. Some even let you create multiple savings "buckets" — one for a car, one for emergencies, one for travel — each earning interest separately.$body$,
 1,
 'content',
 'The first savings bank in the United States opened in 1816 in Philadelphia. It was called the Philadelphia Saving Fund Society and was created specifically to help working-class people save small amounts safely.'),

(2,
 'How Interest Works – Your Money Making Money',
 $body$Interest is the most powerful concept in personal finance — and the most misunderstood by teens. Once you truly understand it, you will never look at a bank account, a loan, or a credit card balance the same way.

Simple interest is straightforward: the bank pays you a percentage of your balance once a year. If you have $1,000 and the rate is 5%, you earn $50 at the end of the year.

Compound interest is different — and dramatically more powerful. With compound interest, you earn interest on your original balance AND on all the interest you've already earned. It's interest on interest, endlessly stacking.

Here's why banks pay you interest at all: when you deposit money, the bank lends it to other people at a higher rate — say, 8% on a car loan — and pays you 4.5% for the privilege of using your money. You're the silent lender. They're the middleman.

APY (Annual Percentage Yield) is the number that matters. It accounts for compounding frequency — daily, monthly, or annually — and tells you the true annual return. A 4.5% APY means $1,000 becomes $1,045 in one year.

The enemy of savings: most big national banks pay 0.01% APY. Online banks regularly pay 4–5% APY. That's the difference between earning $0.10 and $45 on the same $1,000 in one year.$body$,
 2,
 'content',
 'The concept of charging interest is at least 5,000 years old. Ancient Mesopotamian clay tablets from 3000 BCE record grain loans with interest rates — making interest one of the oldest financial inventions in human history.'),

(2,
 'Debit Cards and Transactions – How Money Actually Moves',
 $body$You tap your debit card at the register. The screen says approved. Done, right? Not quite. Understanding what actually happens in those few seconds — and in the hours afterward — will save you from a lot of confusing bank statements and unexpected declined cards.

When you swipe your debit card, the merchant sends a request to your bank: "Does this person have enough money?" Your bank checks your available balance, places a hold on the amount, and sends back "approved." The actual money doesn't leave your account immediately — it settles, usually within 1–3 business days.

This creates a gap between your current balance ($47.20) and your available balance ($22.20) — if you have a $25 pending hold from a gas station, a restaurant pre-tip hold, or any merchant that hasn't fully settled yet. Spending to your "current balance" when your available balance is lower is how people accidentally overdraft.

Debit vs. Credit distinction: a debit card spends money you already have. A credit card borrows money and sends you a bill later. Debit cards cannot be overspent beyond your balance (unless you have overdraft coverage enabled — more on that next chapter). Credit cards have a separate credit limit.

Card security: debit cards tied directly to your checking account carry more immediate risk than credit cards if stolen. Most banks offer zero-liability fraud protection, but you must report unauthorized charges quickly — typically within 60 days. Always monitor your account after any tap or swipe.$body$,
 3,
 'content',
 'The very first debit card was introduced by Bank of America in Seattle in 1978. Customers were skeptical — they were used to writing checks. Today, over 8 billion debit card transactions happen every single month in the United States alone.'),

(2,
 'Overdraft and Negative Balances – The $35 Trap',
 $body$Jordan opened her first checking account the week she got her first job. She was careful — or so she thought. Then one Friday, she swiped her debit card at Wawa for $8.49. Her bank sent a text: your account balance is -$26.51. Then another text: overdraft fee of $35 charged. She'd spent $8.49 and it cost her $43.49.

Here's what happened: her paycheck was pending and hadn't cleared yet. Her available balance was $6.00, not the $106 she thought. The $35 overdraft fee was her bank's charge for covering the difference — essentially a very expensive one-day loan.

Overdraft: your bank lets a purchase go through even when you don't have enough funds, then charges a fee — typically $25–$35 per transaction. Some banks will stack multiple overdraft fees in a single day if multiple charges hit a low balance.

Opt-in and opt-out: under federal regulations, banks must get your explicit permission (opt-in) to charge overdraft fees on debit card transactions. If you never opted in, your card declines instead of overdrafting — which is actually better for most people. Check your account settings today.

Overdraft protection: many banks offer a linked savings account as a buffer. If your checking runs low, it automatically pulls from savings to cover the gap, usually for a much smaller fee or free. This is a smarter safety net than standard overdraft.

The fastest overdraft recovery: transfer money in immediately, call your bank to request a one-time fee waiver (banks grant this surprisingly often for first-time occurrences), and set up low-balance alerts so this never happens again.$body$,
 4,
 'content',
 'American banks collected approximately $7.7 billion in overdraft fees in 2022. That is roughly $59 per US household per year — mostly paid by people who are already financially stressed. Several major banks have recently eliminated overdraft fees entirely under public pressure.'),

(2,
 'Bank Fees You Can Avoid – The Hidden Costs of Bad Bank Choices',
 $body$The average American pays hundreds of dollars a year in bank fees — and most of it is completely avoidable. Fee-loaded accounts don't just cost dollars; they teach the wrong lesson: that banking is expensive. It isn't, if you choose correctly.

Monthly maintenance fees ($5–$25/month): many traditional banks charge just for having an account. Online banks almost never do. Switching banks can save you $60–$300 a year instantly.

Out-of-network ATM fees ($3–$5 per transaction): your bank charges a fee. Then the ATM owner charges another fee. A $20 cash withdrawal at the wrong ATM can cost nearly $10 in fees — a 50% surcharge. Online banks like Ally or SoFi refund all ATM fees nationally.

Minimum balance fees: some accounts require you to keep $500 or $1,500 in the account or get charged $10–$15/month. For teens with variable incomes, this can be a real trap.

Paper statement fees: some banks charge $2–$5/month if you don't switch to paperless. Opt-in to paperless statements in your account settings right now — takes 30 seconds.

Wire transfer fees ($20–$35 per wire): for everyday money movement, use Zelle, Venmo, or ACH transfers instead — they're typically free.

Foreign transaction fees (1–3% of purchase): if you travel internationally and use a debit card, some banks charge a percentage of every transaction. Charles Schwab's checking account refunds all international ATM fees and charges zero foreign transaction fees — a travel essential.

The best teen banking move right now: open a no-fee checking account with a nationwide ATM network (or ATM fee refunds) and a high-yield savings account at an online bank. This single decision is worth hundreds of dollars in saved fees annually.$body$,
 5,
 'content',
 'In 2023, the Consumer Financial Protection Bureau found that five major US banks collected 42% of all overdraft/NSF fee revenue — totaling over $3 billion — primarily from customers who had fewer than $350 in their accounts at the time of the fee.'),

(2,
 'Safe Banking Habits – Protecting Your Money Like a Pro',
 $body$You can do everything right — earn well, save consistently, avoid fees — and still lose thousands of dollars in hours if you skip account security basics. Teens are the fastest-growing demographic targeted by financial scams, precisely because they're active on the same platforms scammers use.

Phishing: the most common attack. A fake text, email, or DM that looks like it's from your bank, asking you to click a link and enter your login. Real banks never ask for your password, PIN, or full account number via text or email. Ever. Period. If you're unsure, call the number on the back of your card — not a number in the message.

Card lock/freeze: every major banking app has a feature to instantly freeze your debit card. If you lose your card, don't wait — freeze it in the app in 5 seconds. You can unfreeze it just as fast when you find it.

Account alerts: set up push notifications for every transaction, even $1.00. The moment a charge you don't recognize hits your account, you'll know. Early detection prevents a $50 fraud from becoming $5,000.

Strong credentials: use a unique password for your bank account — never the same one you use for social media. Enable two-factor authentication (2FA) using an authenticator app (more secure than SMS codes). Write down your recovery codes and store them somewhere safe offline.

Public Wi-Fi: never check your bank account on public Wi-Fi without a VPN. Shared networks can be monitored. Use your phone's cellular data for banking.

Social engineering: many teens get scammed by people they know online who claim to be in emergencies. "I'm stuck abroad, can you Venmo me money and I'll pay you back?" — this script steals millions annually. Always verify urgency claims via a phone call to the real person.$body$,
 6,
 'content',
 'According to the FTC, people aged 18–29 report losing money to fraud more often than people aged 70 and older — largely from social media and online shopping scams. Young people are not less careful; they are simply more active in the environments where modern fraud happens.'),

(2,
 'Build Your First Banking System – Money on Autopilot',
 $body$Most people think about money reactively: they check their balance when they're worried, move money when something goes wrong, and scramble at the end of the month. A banking system flips this entirely. Your money moves on schedule, on purpose, whether you think about it or not.

The foundation is a split: every dollar that comes in gets assigned immediately. A common starter split for teens: 70% spending (checking), 20% savings (high-yield savings account), 10% goals or giving. You adjust the ratios based on your life, but the split always happens before you start spending.

Automate on payday: set up an automatic transfer from checking to savings on the same day your paycheck hits. This is the "pay yourself first" principle in action. When saving is automatic, it's not a decision — it's a system.

Autopay guardrails: use autopay for any recurring bills (phone plan, subscription services) to avoid late fees. But review your autopay list every 3 months — subscriptions accumulate silently and can easily drain $50–$100/month you forgot you had.

The weekly 10-minute check: every Sunday (or whatever day works), open your banking app. Check your account balance against your expected balance. Look for any unfamiliar charges. Confirm upcoming autopay amounts won't overdraft. This one habit catches 90% of banking problems before they become expensive.

Your first banking system (step by step):
Step 1: Open a free checking account with a debit card.
Step 2: Open a high-yield savings account (can be same bank or a different one).
Step 3: Set up a recurring weekly or per-paycheck transfer to savings.
Step 4: Enable low-balance alerts (at $50 and $100).
Step 5: Turn on push notifications for every transaction.
Step 6: Schedule a weekly 10-minute account review.

That's it. Six steps. This is the entire system that most financially healthy adults use — you can have it running by this weekend.$body$,
 7,
 'content',
 'Studies show that people who automate their savings save 173% more per year on average than those who manually transfer money. The act of removing the decision entirely — saving before you''re even tempted to spend — is one of the highest-leverage behavioral finance interventions ever documented.');

-- ─── Update Lessons with Rich Sections JSONB ─────────────────

-- ── Lesson 1: Checking vs Savings ────────────────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Marcus got his first paycheck at 16 and felt rich. He had one bank account — checking — and spent freely. Three months later he noticed he'd \"saved\" nothing, even though he'd earned $1,400. His friend Priya, same job, same pay, had $420 sitting in a savings account she barely touched. The difference wasn't income. It wasn't discipline. Priya had two accounts with two different rules. Marcus had one account with no rules."
    },
    {
      "type": "body",
      "title": "Two Accounts, Two Completely Different Jobs",
      "body": "Checking account — the spending hub:\n• Built for daily transactions (debit card, Venmo, direct deposit)\n• Usually pays zero or near-zero interest\n• No limits on how many times you withdraw\n• Think of it as your wallet, digitized\n\nSavings account — the growth vault:\n• Built to hold money you don't need immediately\n• Pays you interest (APY) just for keeping money there\n• Some accounts limit withdrawals to 6 per month\n• Think of it as a vault that pays rent to you for storing your money\n\nThe rule: money for spending lives in checking. Money for keeping lives in savings. Never blur this line."
    },
    {
      "type": "body",
      "title": "High-Yield Savings vs Regular Savings",
      "body": "Not all savings accounts are equal.\n\nRegular big-bank savings: 0.01% APY — $1,000 earns $0.10 per year. Basically zero.\n\nHigh-yield savings (HYSA) at online banks: 4.0–5.0% APY — $1,000 earns $40–$50 per year.\n\nThat's a 400–500x difference for doing absolutely nothing except moving your money to a different account at a different (online) bank.\n\nPopular HYSA options: Marcus by Goldman Sachs, Ally Bank, SoFi, Discover Online Savings. All FDIC-insured. All free to open. Most take 5–10 minutes online."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: The Savings Blur",
      "body": "The most common teen banking mistake: using the savings account as a backup checking account. You swipe your debit card, the checking runs low, and you transfer $20 from savings \"just this once.\"\n\nThree problems:\n1. You're erasing the habit that builds wealth\n2. Some accounts charge fees for excessive withdrawals\n3. The line between saving and spending disappears, and saving slowly stops happening\n\nFix: treat your savings account like an account you cannot see in your day-to-day banking view. If you use a different bank for savings than checking, you'll psychologically spend less of it."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "You save $50/month for one year:\n\nAt a big bank (0.01% APY):\n$600 saved + $0.03 interest = $600.03\n\nAt a high-yield savings account (4.5% APY):\n$600 saved + ~$14.63 interest = $614.63\n\nDifference: $14.60 more — just from choosing the right savings account.\n\nOn $5,000 saved:\nBig bank: $5,000.50 after one year\nHYSA: $5,225 after one year\n\nThat $224.50 gap is a free dinner, a tank of gas, or a start toward your next goal — earned by doing nothing except choosing the right bank."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You have $800 saved and you're deciding where to keep it:\n\nOption A: Leave it all in your checking account for easy access.\n\nOption B: Keep $100 in checking (everyday spending buffer) and move $700 to a HYSA.\n\nOption C: Split evenly — $400 checking, $400 HYSA.\n\nWalk through each option. Which gives you the most growth? Which gives you the most safety? Which most closely mirrors the \"two accounts, two jobs\" rule? What would you actually do — and why?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Do you currently have a savings account separate from your checking? If yes — is it a high-yield account or a big-bank account paying almost nothing?\n\nIf you don't have a savings account yet, search right now for \"best high-yield savings account for teens\" and write down the top option you found.\n\nIf you already have both accounts: what's your current rule for how much stays in each? Is it intentional — or just whatever's left over after spending?"
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 1;

-- ── Lesson 2: How Interest Works ─────────────────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Two cousins, same $2,000 from a summer job. Cousin A puts it in a Chase savings account. Cousin B puts it in a Discover Online Savings account. Same year. Same $2,000. One year later, Cousin A has $2,000.20. Cousin B has $2,090. The only difference? Cousin B understood one word: APY."
    },
    {
      "type": "body",
      "title": "Simple Interest vs Compound Interest",
      "body": "Simple interest: you earn a percentage of your original principal every period.\n\n$1,000 at 5% simple interest = $50/year, forever calculated on that original $1,000.\n\nCompound interest: you earn a percentage of your growing balance — including all previously earned interest.\n\nYear 1: $1,000 × 5% = $50 → balance becomes $1,050\nYear 2: $1,050 × 5% = $52.50 → balance becomes $1,102.50\nYear 3: $1,102.50 × 5% = $55.13 → balance becomes $1,157.63\n\nThe snowball effect: every year the interest amount is slightly larger, because your balance is slightly larger. Over decades, this creates exponential growth from the same initial deposit."
    },
    {
      "type": "body",
      "title": "APY Explained — The Number That Actually Matters",
      "body": "Banks advertise two numbers: interest rate and APY.\n\nInterest rate: the base percentage before compounding is considered.\n\nAPY (Annual Percentage Yield): the actual return you get after compounding is factored in. This is the number to compare.\n\nCompounding frequency matters:\n• Daily compounding = interest calculated 365 times a year, then added to your balance. Slightly better for you.\n• Monthly compounding = interest calculated 12 times a year.\n• Annual compounding = interest calculated once a year. Slightly worse for you.\n\nMost high-yield savings accounts compound daily and pay monthly — meaning each day you earn a tiny sliver of interest that gets added to your balance, slowly increasing your next day's interest. Over years, this adds up significantly.\n\nBottom line: always compare APY, not interest rate. The bank with the highest APY puts the most money in your pocket."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: The 0.01% Trap",
      "body": "Wells Fargo Way2Save Savings: 0.01% APY (last checked 2026).\nAlly Bank Online Savings: ~4.25% APY.\n\nIf you put $1,000 in each for 5 years:\nWells Fargo: ~$1,000.50\nAlly: ~$1,232\n\nThat's a $231.50 difference — earned by doing nothing except opening a different kind of account. Many teens have their savings sitting in 0.01% accounts because that's where their parents opened their first account, and no one ever told them there was a better option.\n\nNow you know. You have no excuse."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "The Rule of 72: divide 72 by your interest rate to find how many years it takes to double your money.\n\nAt 0.01% APY → 72 ÷ 0.01 = 7,200 years to double. (Not a typo.)\nAt 1% APY → 72 ÷ 1 = 72 years to double.\nAt 4.5% APY → 72 ÷ 4.5 = 16 years to double.\nAt 7% APY (investing) → 72 ÷ 7 = ~10 years to double.\n\n$500 today at 4.5% APY:\n• After 16 years: ~$1,000 (doubled once)\n• After 32 years: ~$2,000 (doubled twice)\n• After 48 years: ~$4,000 (doubled three times)\n\nYou never added a dollar after the initial $500. Compound interest did all the lifting."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You receive $500 for your birthday. Three savings options:\n\nOption A: Big national bank savings account — 0.01% APY. Zero effort to open (you already have an account there).\n\nOption B: High-yield savings account at an online bank — 4.5% APY. Takes 10 minutes to open online.\n\nOption C: Leave it in your checking account earning nothing, but accessible instantly.\n\nCalculate what Options A and B return after 5 years. What does the 10-minute effort of opening a HYSA earn you over that period? Is it worth it? What would you tell a friend who chooses Option A or C because it's \"easier\"?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Think about the concept of compounding — earning returns on your returns — and apply it to something beyond money.\n\nSkills compound. Knowledge compounds. Reputation compounds. Each year you learn and practice a skill, you don't just add linearly — you multiply existing ability by new ability.\n\nIn what area of your life are you already compounding? Where could you deliberately start a compounding habit today that would be dramatically larger 10 years from now?"
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 2;

-- ── Lesson 3: Debit Cards and Transactions ───────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Kayla checked her account at 6pm: $74.18 available. She went to dinner with friends and paid $22 — totally fine. She got home and checked again: $52.18. Except she had THREE pending charges she didn't recognize: $1 from a gas station, $25 from the restaurant (not $22 — they include a tip estimate), and $30 from a streaming service that renewed today. Her available balance was actually $18.18. She had nearly overdrafted without doing anything wrong — just without understanding how debit card holds work."
    },
    {
      "type": "body",
      "title": "What Actually Happens When You Swipe",
      "body": "Step 1: You tap or swipe your debit card.\nStep 2: The merchant's bank sends an authorization request to your bank: \"Does this person have at least $22?\"\nStep 3: Your bank checks your available balance (not your current balance), places a hold, and sends back \"approved\" or \"declined.\"\nStep 4: The transaction settles 1–3 business days later, when the actual money transfers and the hold is released.\n\nTwo balances to understand:\n• Current balance: what's actually in your account right now, including settled transactions\n• Available balance: current balance minus any pending holds — what you can actually spend without overdrafting\n\nAlways base spending decisions on your AVAILABLE balance, not your current balance. This is where most debit card overdrafts happen."
    },
    {
      "type": "body",
      "title": "Gas Stations, Restaurants, and the Hold Problem",
      "body": "Gas stations are notorious for $1 or $100 authorization holds. When you swipe before pumping, the station places a large authorization ($75–$100 on many credit cards, $1–$50 on debit) to confirm funds exist. The hold releases hours to days later after the actual charge settles.\n\nRestaurants pre-authorize a slightly higher amount than your bill to cover a potential tip. If your bill is $22, a $30 hold might appear until your actual charge (with your real tip) processes — usually overnight.\n\nHotels and rental cars: often place large \"incidental\" holds ($100–$300) on your card when you check in or pick up, which can temporarily block access to a big chunk of your balance.\n\nDebit vs Credit for these scenarios: because debit holds come directly from money you have, they restrict your actual available funds. Credit card holds affect your credit limit, not your bank balance — one practical advantage of using a credit card (responsibly) for travel and gas."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: The $1 Gas Station Trap",
      "body": "Darnell had $18 in his checking account. He pulled into a gas station to buy a $10 tank of gas — totally covered. He swiped his debit card before pumping. The gas station placed a $75 authorization hold (standard industry practice to confirm funds before dispensing fuel).\n\nHis available balance dropped to -$57. His card declined at the pump.\n\nHe called his bank confused. They explained the hold. He paid cash inside for the $10 instead.\n\nThe lesson: gas stations and hotels tie up more of your available balance than the actual transaction amount. Always know your buffer. Keep at least $100 in checking beyond what you expect to spend — this is your \"hold buffer.\""
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "Your checking account at 9am on Monday:\n\nCurrent balance: $180.00\n\nPending holds:\n• Gas station pre-auth from Friday: $75.00 (releases tonight)\n• Streaming service charged last night, not settled yet: $14.99\n• Restaurant tip hold from Saturday: $8.00\n\nAvailable balance: $180.00 - $75.00 - $14.99 - $8.00 = $82.01\n\nIf you look at $180 and assume you can spend $150 on new headphones today, you'd overdraft by $67.99.\n\nIf you look at your available balance ($82.01), you know you have $82 to spend — and only after the gas hold releases tonight will you have $157."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You have $95 available balance in your checking account. You're at the grocery store and your total comes to $89.14.\n\nScenario A: You pay with your debit card. Approved. Then you remember you have a $12 Spotify charge autopaying tonight.\n\nScenario B: Same purchase — but you also remember that gas station hold from yesterday hasn't released yet.\n\nIn Scenario A, will you overdraft tonight? In Scenario B, depends on the hold amount — work through both.\n\nWhat habit would have prevented this stress entirely? (Hint: check which balance before spending.)"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Open your banking app right now (or do this the next time you log in). Look at ALL pending transactions in your account.\n\nAre any of them amounts you didn't expect — like a gas pre-auth or a tip estimate? How much of your \"available balance\" is actually tied up in holds right now?\n\nOnce you see it, write down a personal rule for minimum checking account balance you will always maintain as a buffer. Most financial advisors suggest keeping at least $100–$200 as a permanent buffer above your expected monthly spending."
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 3;

-- ── Lesson 4: Overdraft and Negative Balances ────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Aisha was 17 when she got her first overdraft fee. She'd bought a $6 sandwich. Her bank charged her $35 for the privilege of being $5.47 short. Then she bought a $3 coffee later that same day — she didn't know she was negative — and got another $35 fee. One sandwich and one coffee cost her $79. She called her bank furious. They refunded one fee as a one-time courtesy. The other $35 was a lesson she never forgot."
    },
    {
      "type": "body",
      "title": "How Overdraft Actually Works",
      "body": "Overdraft occurs when you spend more money than your account contains. Your bank covers the shortfall — and charges you for the service.\n\nThe three overdraft scenarios:\n\n1. Standard overdraft (opt-in required): your bank covers debit card transactions that exceed your balance and charges a fee, typically $25–$35 per transaction. Federal rules require you to opt IN to this service for debit card purchases. If you never opted in, your card will simply decline.\n\n2. Overdraft protection via linked savings: if you link your savings account, the bank automatically transfers the shortfall amount from savings to checking. Much better — usually free or a small flat fee ($5–$10) versus $35.\n\n3. Decline: if you have no overdraft coverage and no linked account, your debit card just declines. This is embarrassing but free — and often the better outcome.\n\nThe NSF (Non-Sufficient Funds) fee: similar to overdraft but applied to checks and ACH transfers (autopay) that are returned unpaid. These can also be $25–$35 and can compound quickly."
    },
    {
      "type": "body",
      "title": "Available Balance vs Current Balance — The Core Confusion",
      "body": "This distinction is responsible for most accidental overdrafts:\n\nCurrent balance: total money in your account including settled transactions. What your statement shows.\n\nAvailable balance: current balance minus any pending holds or scheduled payments. What you can actually spend right now without risking an overdraft.\n\nExample:\nCurrent balance: $142.00\nPending Venmo transfer you sent yesterday: -$50.00\nUpcoming autopay for phone bill tonight: -$45.00\nGas station hold from this morning: -$30.00\n\nAvailable balance: $17.00\n\nIf you see $142 and go buy $80 in groceries tonight, you'll overdraft. If you check available balance first, you know you have only $17 to spend until those transactions clear."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: How to Get a Fee Waived",
      "body": "Most banks will waive one overdraft fee per year — sometimes more — if you call and ask politely.\n\nScript: \"Hi, I noticed I was charged an overdraft fee on [date]. This was my first time overdrafting and I'd really appreciate a one-time courtesy waiver. I've already set up low-balance alerts to prevent this from happening again.\"\n\nSuccess rate: surprisingly high. Bank of America, Chase, Wells Fargo and most credit unions all have documented first-time waiver policies. You won't find this advertised — you have to ask.\n\nCall within 48–72 hours of the charge. Be calm, polite, and specific. Don't demand — ask. If the first representative declines, politely ask if a supervisor can review the request."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "Scenario: You overdraft 3 times in one month at $35/ea:\n$35 × 3 = $105 in fees\n\nIf you had linked your savings account instead (overdraft protection, $0 transfer fee at many banks):\nSame 3 events = $0 in fees\nSavings: $105\n\nAnnualized, if you overdraft 3 times/month:\n$35 × 3 × 12 = $1,260/year in overdraft fees alone\n\nSwitching to overdraft protection or a bank with no overdraft fees (like Ally, Chime, or SoFi) saves that $1,260 every year — money that could compound into $15,000+ over 10 years at 7% investment returns."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "Your bank gives you three overdraft options when you open your account:\n\nOption A: Standard overdraft coverage — card never declines, but you pay $35 per overdraft.\n\nOption B: Overdraft protection via linked savings — auto-transfer from savings covers the gap, $0 fee at this bank.\n\nOption C: No overdraft coverage — card declines if you're short, no fee.\n\nWhich would you choose and why? Is there a right answer for everyone, or does it depend on spending habits? What would you choose for a teen who checks their account daily versus one who almost never checks it?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Log into your current bank account (or the one you plan to open) and find the overdraft settings. What is your current overdraft configuration? Have you ever opted in to standard overdraft coverage without fully understanding it?\n\nIf you have a linked savings account, does it have enough of a buffer to cover an accidental $50 shortfall? If not, what minimum balance would you want in savings to feel secure?\n\nWrite a personal overdraft prevention plan: two specific actions you will take (low-balance alert threshold, minimum balance rule, account linking) to make sure overdraft fees are never part of your banking story."
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 4;

-- ── Lesson 5: Bank Fees You Can Avoid ────────────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Tyler transferred $200 to a new bank account in September. By December he had $170 — and hadn't spent a single dollar of it. What happened? Monthly maintenance fee: $8/month. Paper statement fee: $2/month. Out-of-network ATM fee (twice): $6.50. Total: $30 gone. Tyler had literally paid his bank $30 for the service of holding his money. He didn't know fees existed, because no one had warned him. This lesson is that warning."
    },
    {
      "type": "body",
      "title": "The Fee Taxonomy: What Banks Charge and Why",
      "body": "Monthly maintenance fees ($5–$25/month):\nCharged simply for having an account. Traditional brick-and-mortar banks are more likely to charge these than online banks. Waived if you maintain a minimum balance or receive monthly direct deposits. Online banks almost universally charge $0.\n\nMinimum balance fees ($5–$15/month):\nSome accounts require $300–$1,500 minimum or charge a fee. Dangerous for teens with irregular income.\n\nOut-of-network ATM fees ($2–$5 your bank + $2–$3 ATM owner = up to $8 per withdrawal):\nBoth your bank AND the ATM's bank can charge you. A $60 cash withdrawal from the wrong ATM might actually cost $68.\n\nPaper statement fees ($1–$5/month):\nEasily avoided — switch to paperless in account settings. Takes 30 seconds.\n\nWire transfer fees ($20–$35 per wire):\nFor everyday money movement, use free alternatives: Zelle (instant, bank-to-bank), Venmo, or standard ACH transfers (1–3 business days, free).\n\nForeign transaction fees (1–3% per transaction):\nApplied to debit card purchases abroad. A $500 hotel charge becomes $515. Some banks (Schwab, Wise) charge zero."
    },
    {
      "type": "body",
      "title": "The No-Fee Banking Playbook",
      "body": "You don't have to pay any of the above fees. Here's the exact playbook:\n\n1. Switch to an online checking account: Ally, SoFi, Chime, or Marcus all offer $0 monthly fees, $0 minimum balance, and either no ATM fees or full nationwide ATM fee refunds.\n\n2. Opt into paperless statements immediately: log into any existing bank account settings right now. Find \"Statement Delivery\" and switch to electronic.\n\n3. Use Zelle for transfers: if your bank supports Zelle (most major US banks do), peer-to-peer transfers are free and instant. No wire fees needed for everyday money movement.\n\n4. Use your bank's ATM network: find out which ATM network your bank belongs to (Allpoint, MoneyPass, etc.) and use those ATMs exclusively. There are 55,000+ fee-free Allpoint ATMs across the US.\n\n5. Consider Schwab Investor Checking for travel: zero foreign transaction fees and unlimited worldwide ATM fee refunds. Specifically designed for travelers.\n\nTotal annual fees with this playbook: $0."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: The Subscription Overlap",
      "body": "Beyond bank fees, the modern teen's biggest invisible money drain is subscription stacking.\n\nSpotify: $10.99/month. Netflix: $15.49. Disney+: $13.99. YouTube Premium: $13.99. Apple iCloud storage: $2.99. That's $57.45/month — $689.40/year — before a single bank fee hits.\n\nMany teens have 6–10 active subscriptions and can't name all of them without checking their bank statement.\n\nAction: right now, search your email for the word \"subscription\" or \"renewal\" and see how many services are billing you. Put the total monthly subscription cost in writing. Then decide which ones you actually use. This exercise has historically revealed $30–$80/month in forgotten or duplicate subscriptions for most people who do it."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "Monthly fee comparison across a year:\n\nBig-bank checking with fees:\n• Monthly maintenance: $12\n• 2× out-of-network ATM/month: $10\n• Paper statement: $3\nTotal: $25/month → $300/year in fees\n\nOnline bank (Ally, SoFi, etc.):\n• Monthly maintenance: $0\n• ATM refunds (nationwide): $0\n• Paperless (default): $0\nTotal: $0/month → $0/year\n\nAnnual savings: $300\n\n$300/year invested at 7% for 10 years = $4,143 of extra money — accumulated entirely from choosing the right bank, not from earning more or spending less."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You're choosing between two bank accounts:\n\nOption A: Local bank near your house. $0 to open. $10/month maintenance fee (waived if you keep $500+ average daily balance). 1,200 in-network ATMs in your city. No mobile number alert system.\n\nOption B: Online bank with no physical branches. $0 monthly fee always. 55,000 Allpoint ATMs nationwide. Robust mobile alerts and card freeze features. Takes 10 minutes to apply online.\n\nYou currently keep around $200–$400 in your account and use ATMs twice a month. Which bank is the better deal? Calculate the annual cost difference. Would you ever choose Option A — and under what circumstances?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Do you know how much you paid in bank fees over the last 12 months? Most people don't.\n\nIf you have a bank account: scroll back through 3 months of your statement right now and look for lines marked \"fee,\" \"overdraft,\" \"ATM,\" or \"service charge.\" Add up the total. Project it to a full year.\n\nIf you don't yet have an account: research one online bank and one traditional bank, list all the fees each charges, and write down which you would choose and why.\n\nThe best financial decisions aren't about earning more — they're about stopping the silent drains that work against you 24 hours a day."
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 5;

-- ── Lesson 6: Safe Banking Habits ────────────────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Destiny got a text at 2:14am: \"URGENT: Your Chase account has been locked due to suspicious activity. Verify your identity immediately: [link].\" She was half asleep, anxious, and clicked the link. It looked exactly like Chase's real website. She entered her username, password, and the 6-digit code that appeared on her phone. By 2:19am, $847 had been transferred out of her account. She spent 3 weeks getting it back. The entire attack took 5 minutes and zero technical skill from the scammer — just one moment of fear from Destiny."
    },
    {
      "type": "body",
      "title": "The Phishing Playbook — How Scammers Think",
      "body": "Phishing is the art of impersonating a trusted entity to steal your credentials. It's not technical — it's psychological. The attack relies on three emotions: urgency, fear, and trust.\n\nThe anatomy of a phishing attack:\n1. Create urgency: \"Your account is locked,\" \"Unusual activity detected,\" \"Verify now or lose access.\"\n2. Mimic legitimacy: the website, logo, and language match the real bank perfectly. Scammers download and clone real bank sites.\n3. Collect credentials: once you enter your username/password, they have everything they need in seconds.\n4. Optional second factor bypass: some attacks use real-time relay — you log in on their fake site, they simultaneously log into your real bank, triggering a real 2FA code that they then ask you to enter on the fake page.\n\nHow to instantly identify a phishing attack:\n• Any message creating URGENCY about your account is suspicious\n• Check the URL — phishing sites use slight variations: \"chase-verify.com\" instead of \"chase.com\"\n• Your real bank never sends you a link to log in via text\n• When in doubt: close the message, open your bank's official app directly"
    },
    {
      "type": "body",
      "title": "Account Security Fundamentals",
      "body": "Password hygiene:\n• Use a unique password for your bank account — never reuse one from social media or gaming accounts\n• Long beats complex: \"MyDogChasesBlueBalls2026\" is harder to crack than \"P@$$w0rd\"\n• Use a password manager (Bitwarden is free and excellent) to generate and store strong unique passwords\n\nTwo-factor authentication (2FA):\n• Always enable 2FA on your bank account\n• Authenticator apps (Google Authenticator, Authy) are more secure than SMS codes (text messages can be intercepted via SIM swapping)\n• Store your recovery codes somewhere secure and offline\n\nCard lock/freeze:\n• Every major banking app has a feature to instantly freeze your debit card\n• If you lose your card: freeze it in the app immediately — before calling the bank\n• Unfreezing is just as instant when you find it\n\nTransaction alerts:\n• Set up push notifications for every transaction over $0.01\n• The moment an unauthorized charge appears, you know within seconds\n• Early detection prevents a $50 fraud from escalating to a $5,000 account drain"
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: Social Engineering via Instagram",
      "body": "The newest teen banking scam: someone DMs you on Instagram claiming to be a friend of a friend who's in an emergency — stranded, needs $150-$200 Venmo transfer to get home, will pay back with interest.\n\nAlternate version: \"I can flip your money — send me $200 and I'll send back $400 in 24 hours.\" (They won't.)\n\nAlternate version: \"I know how to get free money from Venmo. Share your login for 5 minutes and I'll show you.\" (Instant account drain.)\n\nRule: never send money digitally to anyone you haven't spoken to on a real phone call — not a text, not a DM. Take 2 minutes, call the number you already have for that person. If they're really in an emergency, they can answer a phone call.\n\nMoney sent via Venmo, Cash App, or Zelle to a scammer is almost never recoverable. These apps treat fraud transfers differently than credit card fraud."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "Time cost vs money cost of basic security measures:\n\nSetting up 2FA on your bank account: 3 minutes → protects against 99.9% of credential-based attacks if done with an authenticator app\n\nEnabling transaction alerts: 2 minutes → every fraud attempt is visible within seconds\n\nCard freeze feature (learning where it is in your app): 1 minute → can freeze in <5 seconds if ever needed\n\nInstalling a password manager and creating a unique bank password: 10 minutes → eliminates credential-reuse attack vector\n\nTotal time investment: ~16 minutes\n\nAverage financial fraud loss per victim in 2024: $2,800 (FTC data)\n\nROI of 16 minutes of security setup: $2,800 / 16 minutes = $175 per minute of protection value."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "It's Thursday night. You get a text from a number you don't recognize: \"Hi, this is [your bank name] fraud prevention. We detected suspicious activity on your account. Please confirm your identity by clicking: [link].\"\n\nOption A: Click the link — it looks real, and you're worried about your account.\n\nOption B: Ignore the text and check your balance in your bank's official app directly.\n\nOption C: Call your bank using the number on the back of your debit card to verify if there's actually an issue.\n\nWhich option is safest? Which option is most common? Why do so many people choose Option A despite the risk? What would you do differently than Destiny?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Security audit — do this right now or within the next 24 hours:\n\n1. Does your bank account have 2FA enabled? If not, enable it in account settings.\n2. Is your bank account password unique — not used anywhere else? If not, change it.\n3. Do you have transaction alerts set up for your account? If not, enable them.\n4. Do you know where the card freeze feature is in your banking app? If not, find it and test it (freeze, then unfreeze).\n5. Have you ever clicked a link in a financial text message? If yes — log in to your bank directly and change your password as a precaution.\n\nWrite down your results. How many of the 5 were already done? Which one will you address today?"
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 6;

-- ── Lesson 7: Build Your First Banking System ────────────────
UPDATE lessons SET
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Two teens. Same job. Same $350/paycheck. Kenji opens his app every payday, thinks for 10 seconds, and does... nothing. The $350 sits in checking. By next payday, $40 is left. He has no idea where $310 went. Nadia has a 30-second ritual every payday: $245 stays in checking, $70 auto-transfers to savings, $35 goes to her travel goal bucket. Six months later Kenji has $40 saved. Nadia has $420. Same income. Completely different system — or complete lack of one."
    },
    {
      "type": "body",
      "title": "The Core Banking System Architecture",
      "body": "A banking system is just rules that execute automatically, without requiring daily decisions.\n\nAccount structure (the minimum you need):\n• 1 checking account — all income comes in here; all spending leaves from here\n• 1 high-yield savings account — your savings and emergency fund\n• Optional: 1–3 savings sub-buckets for specific goals (car, travel, first apartment)\n\nThe Split Rule (set this up once, runs forever):\nEvery paycheck, a predetermined percentage automatically moves to savings before you spend a dollar. Common splits:\n• 70/20/10 — 70% spend, 20% save, 10% goals or giving\n• 60/30/10 — 60% spend, 30% save, 10% invest/goals\n• 80/20 minimum — 80% spend, 20% save (the baseline we recommend for beginners)\n\nOnce you set the split, your job is done. The money moves automatically. You spend what's in checking without guilt — because the saving already happened.\n\nAutopay guardrails:\n• Set essential recurring bills to autopay (phone, subscriptions)\n• Review autopay list every 3 months for cancelled or forgotten services\n• Keep a $100+ buffer in checking beyond expected monthly autopay total"
    },
    {
      "type": "body",
      "title": "The Weekly 10-Minute Account Review",
      "body": "This one habit catches 90% of banking problems before they become expensive:\n\nEvery Sunday (or your payday week start):\n1. Open your banking app\n2. Check current & available balance — do they match your expectation?\n3. Scan for unfamiliar transactions — anything you don't recognize gets flagged immediately\n4. Confirm upcoming autopays — enough buffer for all scheduled charges?\n5. Check savings account — did the automated transfer go through?\n6. One-minute gut check — are you on track with your monthly spending?\n\nWhy Sunday? Your week's spending pattern resets, it's before most Monday autopays, and it creates a clean mental boundary between last week's money decisions and the new week.\n\nTime required: 7–12 minutes. Financial benefit: early fraud detection, overdraft prevention, subscription cost awareness, and a baseline understanding of your money flow at all times."
    },
    {
      "type": "realcheck",
      "title": "Teen Reality Check: Build Your System This Weekend",
      "body": "Here's the exact 6-step implementation checklist:\n\n1. Open a free checking account (if you don't have one) — Ally, SoFi, or Chime take 10 minutes online.\n2. Open a high-yield savings account — same bank or a different one with higher APY.\n3. Set your split — decide your percentage, then schedule a recurring transfer for payday date.\n4. Enable low-balance alerts — set at $50 and $100 so you always know before you're dangerously low.\n5. Enable transaction push notifications — every purchase, every deposit, visible instantly.\n6. Block 10 minutes on Sunday in your calendar — your weekly account review. Treat it as a non-negotiable.\n\nTotal setup time: 30–45 minutes this one time.\nMaintenance after that: 10 minutes/week.\nFinancial impact over 1 year: dramatically more savings, zero surprise overdrafts, caught fraud immediately."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "Nadia's banking system in action:\n\nPaycheck: $350\nSplit: 70/20/10\n• Checking (spending): $245\n• High-yield savings (4.5% APY): $70 → auto-transfers on payday\n• Travel goal bucket: $35 → auto-transfers on payday\n\nAfter 26 paychecks (1 year):\n• Savings account balance: $1,820 + ~$41 in interest = $1,861\n• Travel goal balance: $910\n• Total saved: $2,771\n\nKenji's no-system approach:\n• Savings after 1 year: ~$200 (manually moved when he remembered)\n• Travel goal: $0\n• Total saved: ~$200\n\nDifference: $2,571 — from the same income, same paycheck, same time period. The system created $2,571 Kenji never had."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You earn $280/paycheck (biweekly, so $560/month). You have $200 in monthly expenses (phone, transport, subscriptions).\n\nDesign your banking system:\n1. What split would you use? (Remember: at minimum, save 20%)\n2. How much stays in checking per paycheck?\n3. How much auto-transfers to savings per paycheck?\n4. Do you want a separate goal bucket? For what — and how much/paycheck?\n5. What alert thresholds would you set for checking?\n6. What day would be your weekly review day?\n\nSolve this like it's real — because with $280 paychecks, the math matters. Show your full monthly savings trajectory for 6 months."
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "A banking system is really just a set of pre-made decisions. You decide once — \"I always save 20%\" — and then you don't have to make that decision every week. You remove willpower from the equation.\n\nThis principle applies everywhere in life. Gym membership plus a scheduled workout time means you don't decide whether to go — you just show up. A meal prep Sunday means you don't decide what to eat at 7pm when you're tired and hungry.\n\nWhat other areas of your life could benefit from a pre-made system — where a one-time decision replaces hundreds of future willpower battles?\n\nWrite down two non-financial areas where you could build a system this month. Then write the exact first step to build each one."
    }
  ]$sections$
WHERE school_id = 2 AND lesson_number = 7;

-- ─── Per-Lesson Chapter Quiz Questions ───────────────────────
-- 3 questions per lesson, 21 total — linked by lesson_id subquery

-- Lesson 1 Quiz: Checking vs Savings
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 1),
 'What is the primary purpose of a checking account?',
 'multiple_choice',
 '["To earn the highest possible interest rate on your money", "To handle everyday spending and transactions like debit card purchases", "To lock away money for long-term goals", "To protect against bank failure"]'::jsonb,
 'To handle everyday spending and transactions like debit card purchases',
 'Checking accounts are designed for high-frequency movement — paychecks come in, debit card purchases and transfers go out. They typically earn little or no interest because the trade-off for easy access is lower return.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 1),
 'True or False: A high-yield savings account at an online bank typically pays 400–500 times more interest than a basic big-bank savings account.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'Big national banks often pay 0.01% APY on savings. Online high-yield savings accounts regularly pay 4.0–5.0% APY. The difference is 400–500x on the same deposited amount — for example, $1,000 earns $0.10 vs $45 in one year.',
 'easy', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 1),
 'Marcus has $800 in a single checking account he uses for all spending and saving. What is the main risk with this approach?',
 'multiple_choice',
 '["His checking account will automatically transfer money out", "He has no dedicated savings and is likely to spend money he intended to keep", "Checking accounts are not FDIC-insured like savings accounts", "His debit card will stop working after a certain number of transactions"]'::jsonb,
 'He has no dedicated savings and is likely to spend money he intended to keep',
 'Without separation, saving money requires daily willpower — and willpower fails. A dedicated savings account (especially at a separate bank) creates a psychological and physical barrier that prevents accidental spending of saved funds.',
 'medium', 3);

-- Lesson 2 Quiz: How Interest Works
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 2),
 'What is the key difference between simple interest and compound interest?',
 'multiple_choice',
 '["Simple interest is paid monthly; compound interest is paid annually", "Compound interest earns returns on both the original balance and previously earned interest", "Simple interest is only available at online banks", "Compound interest requires a minimum $1,000 deposit"]'::jsonb,
 'Compound interest earns returns on both the original balance and previously earned interest',
 'This is the critical distinction. Simple interest calculates only on the original principal every period. Compound interest recalculates on the growing balance — including all prior interest — creating the snowball effect that makes early saving so powerful.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 2),
 'Using the Rule of 72, approximately how many years does it take to double $500 at a 4.5% APY savings account?',
 'multiple_choice',
 '["About 8 years", "About 16 years", "About 24 years", "About 72 years"]'::jsonb,
 'About 16 years',
 'The Rule of 72: divide 72 by the interest rate. 72 ÷ 4.5 = 16 years. Your $500 becomes $1,000 in 16 years with zero additional deposits. At 7% (investing), it doubles in about 10 years — illustrating why investing beats saving for long-term wealth.',
 'medium', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 2),
 'True or False: APY (Annual Percentage Yield) is always the same number as the stated interest rate on a savings account.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'APY accounts for compounding frequency and reflects your true annual return. The interest rate is the base rate before compounding. Because most savings accounts compound daily or monthly, the APY is always equal to or higher than the stated rate. Always compare APY, not interest rate, when choosing savings accounts.',
 'medium', 3);

-- Lesson 3 Quiz: Debit Cards and Transactions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 3),
 'When you make a debit card purchase, when does money actually leave your account?',
 'multiple_choice',
 '["Instantly — the moment you swipe", "Within 5 minutes via electronic transfer", "After a settlement period of 1–3 business days", "At the end of each month when your statement closes"]'::jsonb,
 'After a settlement period of 1–3 business days',
 'Swiping creates an authorization hold immediately, but the actual fund transfer (settlement) takes 1–3 business days. This creates a gap between your current balance and your available balance — the root cause of many accidental overdrafts among people who don''t understand the difference.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 3),
 'Why do gas stations often place a $75–$100 hold on debit cards even when you only buy $20 of gas?',
 'multiple_choice',
 '["To charge the customer a convenience fee for pay-at-pump", "To confirm funds exist before dispensing fuel, using a standard authorization amount", "Gas stations are required by law to pre-charge $75 per transaction", "The hold represents the maximum amount of fuel the pump can dispense"]'::jsonb,
 'To confirm funds exist before dispensing fuel, using a standard authorization amount',
 'Gas stations cannot know how much fuel you''ll pump before you start. They place a large standard authorization hold to confirm your bank will cover whatever amount you end up purchasing. The hold adjusts to your actual charge after the pump settles — but in the meantime, the full hold amount is blocked from your available balance.',
 'medium', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 3),
 'True or False: You should always base spending decisions on your current balance rather than your available balance.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'Your current balance includes money that is already committed to pending transactions. Your available balance is what you can actually spend without overdrafting. Spending to your current balance when pending holds exist is one of the most common causes of unexpected overdrafts.',
 'easy', 3);

-- Lesson 4 Quiz: Overdraft and Negative Balances
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 4),
 'Under US federal regulations, what must a bank do before charging overdraft fees on debit card transactions?',
 'multiple_choice',
 '["Send you a written notice 30 days in advance", "Automatically link your savings account", "Get your explicit opt-in consent to the overdraft program", "Report the overdraft to the credit bureaus"]'::jsonb,
 'Get your explicit opt-in consent to the overdraft program',
 'The 2010 Federal Reserve rule requires banks to obtain affirmative opt-in before enrolling customers in standard overdraft programs for debit card and ATM transactions. If you never opted in, your card declines instead of overdrafting — which avoids the fee but is also less embarrassing than an overdrawn account.',
 'medium', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 4),
 'True or False: Banks are generally willing to refund a first-time overdraft fee if you call and politely ask.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'Most major banks have documented first-time overdraft fee waiver policies — they just don''t advertise them. Calling politely within 48–72 hours, being specific about the situation, and mentioning you''ve set up alerts to prevent recurrence significantly increases the chance of a waiver. It costs nothing to ask.',
 'easy', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 4),
 'What is the smartest way to protect yourself against accidental overdrafts without paying $35 fees?',
 'multiple_choice',
 '["Always opt-in to standard overdraft coverage so your card never declines", "Link your savings account as overdraft protection for automatic free transfers", "Keep zero money in checking so the bank has no reason to charge fees", "Use a credit card for all purchases instead of your debit card"]'::jsonb,
 'Link your savings account as overdraft protection for automatic free transfers',
 'Overdraft protection via a linked savings account is the best safety net. When checking runs short, the bank automatically transfers the difference from savings — often free or for a tiny flat fee ($5 or less). This prevents the $35 per-transaction fee while ensuring your card still works.',
 'medium', 3);

-- Lesson 5 Quiz: Bank Fees You Can Avoid
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 5),
 'Tyler deposited $200 and ended up with $170 three months later without spending anything. What most likely happened?',
 'multiple_choice',
 '["The bank invested his money and lost $30", "Monthly maintenance and ATM fees silently drained $30 from his account", "Inflation reduced the real value of his savings", "The bank charged him for not using the account often enough"]'::jsonb,
 'Monthly maintenance and ATM fees silently drained $30 from his account',
 'Monthly maintenance fees ($8/month here), paper statement fees, and out-of-network ATM charges are real recurring costs that can silently reduce your balance even when you''re not actively spending. The solution is choosing the right bank — online banks typically charge $0 in all of these categories.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 5),
 'When you withdraw cash from an out-of-network ATM, how many fee charges can you get hit with?',
 'multiple_choice',
 '["One — from your bank only", "One — from the ATM owner only", "Two — one from your bank and one from the ATM owner", "Three — including a federal cash withdrawal tax"]'::jsonb,
 'Two — one from your bank and one from the ATM owner',
 'Out-of-network ATM use triggers two separate fees: your own bank charges you for using a competitor''s ATM ($2–$5), and the ATM owner charges their own access fee ($2–$3). Combined, a $20 cash withdrawal can incur $8 in fees — a 40% surcharge. Use in-network ATMs or choose a bank that refunds all ATM fees.',
 'medium', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 5),
 'True or False: Switching from paper statements to paperless (electronic) statements at your bank is completely free and can eliminate a monthly fee.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'Many banks charge $1–$5/month for mailing paper statements. Switching to paperless in your account settings takes 30 seconds and immediately eliminates this fee. It''s one of the easiest zero-effort fee eliminations available and is a best practice for account security as well — paper statements in the mail can be stolen.',
 'easy', 3);

-- Lesson 6 Quiz: Safe Banking Habits
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 6),
 'Destiny received a text claiming her bank account was locked and asking her to click a link to verify her identity. What should she have done?',
 'multiple_choice',
 '["Clicked immediately — the urgency suggests it is a real security alert", "Replied to the text with her account number to confirm identity", "Ignored the text and logged into her bank directly via the official app", "Called the phone number included in the text message"]'::jsonb,
 'Ignored the text and logged into her bank directly via the official app',
 'Legitimate banks never send links asking you to log in via text. The correct response is always to close the message and navigate directly to your bank''s official app or website yourself. If there is a real issue, it will appear in your actual account. Never click links in financial text messages, even if they look authentic.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 6),
 'Why is using an authenticator app (like Google Authenticator) more secure than receiving 2FA codes via SMS text message?',
 'multiple_choice',
 '["Authenticator apps work without internet, making them immune to all attacks", "SMS codes can be intercepted via SIM swapping, while authenticator app codes cannot", "Text message codes are only 4 digits while authenticator codes are 8 digits", "Banks only accept authenticator app codes, not SMS codes"]'::jsonb,
 'SMS codes can be intercepted via SIM swapping, while authenticator app codes cannot',
 'SIM swapping is an attack where a criminal convinces your phone carrier to transfer your phone number to their SIM card — giving them access to all your incoming SMS, including 2FA codes. Authenticator app codes are generated locally on your device and never transmitted over the phone network, making them immune to this attack.',
 'hard', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 6),
 'True or False: If you lose your debit card, you should wait until you find it before taking any action.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'You should instantly freeze your debit card in your banking app the moment it is lost or missing — even if you think you might have just misplaced it. Freezing is instant, reversible, and prevents any fraudulent use. Waiting even hours while a lost card is in someone else''s hands can result in hundreds or thousands of dollars in unauthorized charges.',
 'easy', 3);

-- Lesson 7 Quiz: Build Your First Banking System
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 7),
 'Nadia saves $2,771 in one year while Kenji saves only $200 on identical income. What single factor explains the entire difference?',
 'multiple_choice',
 '["Nadia earned interest on a larger starting balance", "Nadia had a structured automated banking system with a predetermined split", "Kenji spent money on more expensive lifestyle choices", "Nadia worked more hours during school breaks"]'::jsonb,
 'Nadia had a structured automated banking system with a predetermined split',
 'The difference is entirely structural, not behavioral. Nadia''s automated 70/20/10 split meant saving happened before she could spend. Kenji saved manually whenever he remembered — which was rarely. Same income, same time period: the system created $2,571 of additional savings that Kenji never accumulated.',
 'easy', 1),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 7),
 'In a well-designed teen banking system, what is the recommended minimum percentage of each paycheck to automatically transfer to savings?',
 'multiple_choice',
 '["5%", "10%", "20%", "50%"]'::jsonb,
 '20%',
 'The 20% savings target is the consistent recommendation across personal finance — from the 50/30/20 rule to financial advisors. For teens with lower fixed expenses, 20% is achievable and creates a meaningful savings rate. Lower percentages (5–10%) can work but produce significantly smaller long-term results. The key is automation — whatever percentage you choose, it should happen automatically on payday.',
 'medium', 2),

(2,
 (SELECT id FROM lessons WHERE school_id = 2 AND lesson_number = 7),
 'True or False: The purpose of a weekly 10-minute account review is to catch problems early before they become expensive.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'A weekly 10-minute review catches: unauthorized transactions within days instead of months, autopay subscriptions that should have been cancelled, low-balance situations before they trigger overdraft fees, and failed automated transfers to savings. Problems found early are almost always cheaper and faster to resolve than problems discovered weeks later on a monthly statement.',
 'easy', 3);

-- ============================================================
-- VERIFICATION QUERIES (run manually after migration to confirm)
-- ============================================================
-- -- Confirm School 2 metadata
-- SELECT id, title, order_number, is_premium, min_age FROM schools WHERE id = 2;
--
-- -- Confirm exactly 7 lessons for School 2
-- SELECT COUNT(*) AS lesson_count FROM lessons WHERE school_id = 2;
--
-- -- Confirm all 7 lessons have sections JSONB populated
-- SELECT lesson_number, title, (sections IS NOT NULL) AS has_sections
-- FROM lessons WHERE school_id = 2 ORDER BY lesson_number;
--
-- -- Confirm exactly 21 quiz questions for School 2
-- SELECT COUNT(*) AS question_count FROM quiz_questions WHERE school_id = 2;
--
-- -- Confirm 3 questions per lesson via lesson join
-- SELECT l.lesson_number, l.title, COUNT(q.id) AS question_count
-- FROM lessons l
-- LEFT JOIN quiz_questions q ON q.lesson_id = l.id
-- WHERE l.school_id = 2
-- GROUP BY l.lesson_number, l.title
-- ORDER BY l.lesson_number;
--
-- -- Confirm no orphaned quiz questions (all have valid lesson_id)
-- SELECT COUNT(*) AS orphaned FROM quiz_questions
-- WHERE school_id = 2 AND lesson_id IS NULL;
