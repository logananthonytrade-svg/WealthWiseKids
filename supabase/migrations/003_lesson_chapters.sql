-- ============================================================
-- WealthWise Kids — Lesson Chapters + Rich Content Seed
-- Run AFTER 001_main_schema.sql and 002_bot_tables.sql
-- Adds:
--   • lessons.sections JSONB        — structured content blocks
--   • student_progress.chapter_quiz_passed — per-lesson quiz gate
--   • Full School 1 rich lesson content (7 lessons)
--   • 3 per-lesson quiz questions each (21 total, linked by lesson_id)
-- ============================================================

-- ─── Schema Additions ────────────────────────────────────────

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS sections JSONB;

ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS chapter_quiz_passed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS chapter_quiz_passed_at TIMESTAMPTZ;

-- Legacy data: treat existing completed lessons as quiz-passed
UPDATE student_progress
  SET chapter_quiz_passed = TRUE
WHERE completed = TRUE AND chapter_quiz_passed = FALSE;

-- ─── Update School 1 Rich Lesson Content ─────────────────────
-- Each lesson gets full sections JSON + updated narrative content.
-- Dollar-quoting ($body$…$body$) avoids apostrophe escaping hell.

-- ── Lesson 1: The Evolution of Money ─────────────────────────
UPDATE lessons SET
  title   = 'The Evolution of Money – From Barter to Bitcoin',
  content = $body$Imagine it's 6000 BCE. You're a teenager in ancient Mesopotamia, backpack slung over your shoulder (okay, it's a woven sack), and you really want a new pair of sandals. You've got three fat sacks of barley. You walk to the market... but the sandal-maker doesn't want barley. He wants goat milk. So you trek to the goat herder, trade barley for milk, then haul it back. By the time you get the sandals, the sun is setting and you're exhausted. Welcome to the barter system — the original "double coincidence of wants" nightmare.

That frustration is literally why money was invented — and once you see how it evolved, you'll never look at the $20 in your wallet the same way.$body$,
  fun_fact = 'The word "salary" comes from the Latin word "salarium" — meaning salt money. Roman soldiers were sometimes paid in salt because it was so valuable for preserving food. That''s where the phrase "worth your salt" comes from.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Imagine it's 6000 BCE. You're a teenager in ancient Mesopotamia. You really want new sandals, but you've only got sacks of barley. The sandal-maker wants goat milk. The goat herder wants cloth. By the time you trade your way around the market and finally get the sandals, the sun is setting and you're exhausted. That frustrating cycle — known as the \"double coincidence of wants\" nightmare — is exactly why humanity invented money."
    },
    {
      "type": "body",
      "title": "Money's Epic Time-Lapse",
      "body": "Fast-forward through history like a TikTok skip:\n\n1200 BCE — China uses cowrie shells, bronze knives, and spade-coins. Durable, divisible, and everyone agrees they have value.\n\n600 BCE — King Croesus of Lydia (modern Turkey) stamps the first official gold and silver coins. A lion roaring on a coin of guaranteed weight. Trade EXPLODES.\n\n700s CE — China invents paper money (\"flying money\") so merchants don't have to haul heavy metal. Marco Polo brings the idea to Europe in the 1200s and Europeans' minds are blown.\n\n1792 — The brand-new United States passes the Coinage Act. Official coins. Official currency. A country still inventing itself needs money everyone trusts.\n\n1944 — The Bretton Woods Agreement pegs most world currencies to the US dollar, which is pegged to gold. Rock-solid... until 1971, when President Nixon shocks the world on live TV: \"We're closing the gold window.\" Pure fiat money is born — the dollar's value now runs on trust and nothing else.\n\n2009 — Satoshi Nakamoto publishes the Bitcoin whitepaper. Digital money backed by math, energy, and a global computer network. A high-schooler in their bedroom can now send value across the planet faster than you can Venmo your friend for Chick-fil-A."
    },
    {
      "type": "body",
      "title": "Money's Three Jobs — Always and Forever",
      "body": "No matter the form — cowrie shells, gold coins, or crypto — money has always had exactly three jobs:\n\n💱 Medium of Exchange — Makes trading easy. No more barley-for-milk drama.\n\n🏦 Store of Value — Should hold its worth over time. Gold did this brilliantly. Your $20 bill during 8% inflation? Not so much.\n\n📏 Unit of Account — Lets you measure and compare prices. That Fortnite skin costs 1,200 V-Bucks = $9.99. Simple."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check",
      "body": "During the 2021–2023 inflation spike, the same pair of Jordan 1s jumped from $170 to $220. That's money losing its \"store of value\" job in real time — your $170 could buy them one year, but not the next.\n\nMeanwhile, someone who bought Bitcoin in 2020 watched it 10x in a year... then crash 70%... then recover. That's the new money frontier: high reward, high risk, zero gold backing. Just math and belief."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "If inflation runs at 8% per year, a $10 item costs $10.80 next year. After 10 years it costs $21.59 — more than double. This is why keeping all your money in a mattress is actually LOSING money. Your cash needs to grow at least as fast as inflation just to stay even."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You just got $500 in birthday cash. You have three options:\n\nA) Spend it on sneakers, a GPU, or concert tickets right now.\n\nB) Put it in a high-yield savings account at 4.5% APY while you think.\n\nC) Buy $500 of Bitcoin or another crypto — high risk, high potential reward.\n\nWalk through your reasoning out loud. What does each choice say about how you think about money's three jobs?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Money is fundamentally a story that everyone agrees to believe in. When the story breaks — hyperinflation in Venezuela, bank runs in 2008, crypto crashes in 2022 — people panic.\n\nHow does understanding 6,000 years of money history make you smarter with the dollars in your Venmo right now? Write 3 sentences about what you'd do differently."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 1;

-- ── Lesson 2: Earning Money ───────────────────────────────────
UPDATE lessons SET
  title   = 'Earning Money – Skills, Side Hustles, and Your First Real Paycheck',
  content = $body$It's Friday after school. Your buddy Alex is scrolling TikTok when he sees a creator making $3,000 a month selling digital planners on Etsy. Alex thinks, "I'm decent at Canva... why not me?" Three weeks later he's launched "StudyGlow Planners" and already has 47 sales. That's the new earning game — and it doesn't require a boss, a punch clock, or a permission slip.$body$,
  fun_fact = 'Warren Buffett earned his first dollar at age 6, selling chewing gum door-to-door. By age 11 he had already bought his first stock. By 13 he was filing tax returns as a self-employed delivery boy. The earning mindset starts early.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "It's Friday after school. Your buddy Alex is scrolling TikTok when he sees a creator making $3,000 a month selling digital planners on Etsy. Alex thinks, \"I'm decent at Canva... why not me?\" Three weeks later he launches \"StudyGlow Planners\" and already has 47 sales. That's the new earning game — and it doesn't require a boss, a punch clock, or a permission slip from anyone."
    },
    {
      "type": "body",
      "title": "The Earning Skill Tree",
      "body": "Earning isn't just \"get a job.\" It's a skill tree you level up:\n\n⏱ Hourly Wages — You trade time for money at a fixed rate. Target shift at $16/hr means 1 hour = $16. Predictable, but your ceiling is hard-capped by the clock.\n\n📅 Salary — Fixed annual pay split into regular paychecks. More stable; harder to negotiate until you have leverage.\n\n📊 Commission — You eat what you kill. Sell more = earn more. High ceiling, zero floor. Used in real estate, car sales, and many online businesses.\n\n🚗 Gig Economy — DoorDash, Uber, TaskRabbit, Fiverr. You're a contractor, not an employee. Flexible schedule, but no benefits and you handle your own taxes (more on that in School 4).\n\n🎨 Creator Economy — TikTok creator fund, YouTube AdSense, Patreon, brand deals. Your content works while you sleep."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check: Mia's Story",
      "body": "Mia, 16, hated folding clothes at retail for $15/hr. She spent one summer learning video editing on CapCut — free app, YouTube tutorials, zero cost. She started offering \"prom highlight reels\" to classmates for $75 each.\n\nBy junior year she had a waitlist and was clearing $600/month while still going to school. Same hours, way more money — because she swapped time-trading for VALUE-trading.\n\nKey insight: Your earning power grows with your skills, not your hours."
    },
    {
      "type": "body",
      "title": "High-School Money Plays (That Actually Work Right Now)",
      "body": "You don't need to wait until 18 or college to build real earning skills:\n\n• TikTok/YouTube — Create content in any niche you care about. Even 10k followers can earn brand deals.\n• Depop/StockX — Buy thrifted or discounted items, flip for profit. Teens are running $2k/month resale operations.\n• Outschool — Teach younger kids a skill you have (coding, art, music, test prep) for $20–$60/hr.\n• Facebook Marketplace — Flip furniture, electronics, anything.\n• Roblox game dev — Games that go viral earn Robux that converts to real dollars.\n• Lawn care crew — The most underrated teen hustle. $50/yard. 10 yards/week = $500."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "If you earn $200/week from a part-time job and auto-transfer 20% to savings before you touch it:\n\n$200 × 20% = $40/week saved\n$40 × 52 weeks = $2,080 saved in one year WITHOUT trying.\n\nNow invest that $2,080 at 7% annually for 10 years: it becomes $4,093. The money you barely noticed saving doubled while you were living your life."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You have 10 free hours per week. Two options:\n\nA) $18/hr at a fast-food job = $180/week, all summer.\n\nB) Spend 4 of those hours (2 months) learning CapCut or Canva on YouTube, then launch a freelance service at $40–$60/hr.\n\nOption A pays immediately. Option B pays nothing for 2 months, then potentially 2–3x more per hour forever.\n\nWhich do you pick — and why? Is there a hybrid approach?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Write down three skills you already have that someone would pay for right now — even $20.\n\nThen pick ONE and Google: \"how to turn [your skill] into money as a teen.\"\n\nWhat did you find? The goal isn't to start a business today — it's to realize you already have more earning potential than you think."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 2;

-- ── Lesson 3: Spending Wisely ─────────────────────────────────
UPDATE lessons SET
  title   = 'Spending Wisely – The Psychology Traps Stealing Your Money',
  content = $body$It's 2 a.m. You're doom-scrolling Instagram. Some influencer drops a limited-edition hoodie for $89. Your brain screams "FOMO!" You tap Buy Now before you've even checked your balance. Two days later you're wearing it once, feeling buyer's remorse, and staring at a $89 hole in your savings. Sound familiar? That wasn't you being weak. That was billion-dollar psychology designed specifically for your brain.$body$,
  fun_fact = 'Companies spend over $800 billion per year on advertising globally — much of it designed using behavioral psychology to exploit decision-making shortcuts. That "Only 3 left!" timer on a website? It''s almost never real. It''s a scarcity trigger engineered to bypass your rational brain.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "It's 2 a.m. You're doom-scrolling Instagram. An influencer drops a limited-edition hoodie for $89. Your brain screams FOMO. You tap Buy Now before you've even checked your balance. Two days later it arrives, you wear it once, and you're staring at an $89 hole in your savings account. Sound familiar? That wasn't you being weak. That was billion-dollar psychology firing perfectly — designed specifically for your brain, at 2 a.m., when your defenses are lowest."
    },
    {
      "type": "body",
      "title": "Why Your Brain Is a Terrible Shopper",
      "body": "Companies spend billions studying teen psychology. Here's what they use against you:\n\n🧠 Dopamine Hits — Every purchase triggers a tiny dopamine release. Your brain feels reward before you even get the item. Online shopping is literally engineered like slot machines.\n\n⏰ Artificial Scarcity — \"Only 47 left!\" / \"Sale ends in 02:14:07\" — These timers are almost always fake. They create urgency where there is none.\n\n👥 Social Proof — \"2,847 people bought this today\" — triggers your herd instinct. If everyone's buying it, your brain assumes you should too.\n\n📱 Algorithmic FOMO — Your feed is tuned to show you what your friends are wearing, eating, and doing. The algorithm makes comparison automatic and constant."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check: Jake's $180 Mistake",
      "body": "Jake, 17, had $400 saved for his first car down payment. Then Supreme dropped a new box logo tee. He spent $180 in 45 seconds.\n\nTwo weeks later he saw the same shirt on resale for $120. The $60 price gap hurt — but the real loss was the opportunity cost: that $180 toward the car would have saved him 6 months of bus costs and given him freedom.\n\nOpportunity cost = what you give up by choosing one thing over another. Every dollar you spend IS a decision about what you won't have."
    },
    {
      "type": "body",
      "title": "The Spending Defense Playbook",
      "body": "You can't out-willpower billion-dollar marketing. You need systems:\n\n⏳ The 24-Hour Rule — See something you want? Wait 24 hours before buying anything over $20. 80% of the time, the urge disappears on its own.\n\n📋 Needs vs. Wants List — Before any shopping trip (physical or digital), write your list. Stick to it. The list is your rational brain talking to your impulse brain.\n\n📊 Track every dollar for 30 days — Use Notes, a spreadsheet, or an app. You will be genuinely shocked where your money goes. Most teens discover $80–$150/month in \"invisible\" drains (in-app purchases, DoorDash convenience fees, app subscriptions).\n\n🎯 Give your money a job first — Budget your savings and big goals before spending on anything. Money with a job is much harder to carelessly spend."
    },
    {
      "type": "mathbreak",
      "title": "Math Break",
      "body": "$5/day on energy drinks or coffee = $35/week = $1,825/year.\n\nOver 4 years of high school and college: $7,300 spent on beverages.\n\nIf you'd invested that $1,825/year at 7% for 4 years instead: $8,276.\n\nThis isn't saying \"never enjoy anything.\" It's saying: know the ACTUAL cost of your habits, then decide consciously."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You have exactly $50 left in your monthly fun budget. Tomorrow a new game drops for $60. Next week the concert you've waited for is $45.\n\nOptions:\nA) Buy the game now (you're $10 over — borrow from next month)\nB) Wait for the game, go to the concert\nC) Skip both, let the $50 roll into next month's budget\n\nWalk through your decision. What psychology traps are tugging at you right now? Which option does your RATIONAL brain choose vs. your impulse brain?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "For the next 7 days, screenshot or note every purchase — and write the emotion that triggered it.\n\nWere you bored? Stressed? Envious? Excited? Tired?\n\nAt the end of the week, look for patterns. Most people discover they're not shopping for things — they're shopping for feelings. Once you see the pattern, you can choose a different response."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 3;

-- ── Lesson 4: Saving ──────────────────────────────────────────
UPDATE lessons SET
  title   = 'Saving – Your Financial Foundation and the Cheat Code Called Compound Interest',
  content = $body$Meet Sarah and Ethan. Both are 15. Both have part-time jobs. Sarah auto-transfers $25 every paycheck into a high-yield savings account. Ethan laughs and spends every dollar on sneakers and takeout. Fast-forward 20 years: Sarah has $22,000 before she's even tried to invest. Ethan is still playing catch-up, wondering where his money went. The difference wasn't income. It was one habit started at age 15.$body$,
  fun_fact = 'Albert Einstein reportedly called compound interest the "eighth wonder of the world," saying: "He who understands it, earns it. He who doesn''t, pays it." Whether or not Einstein actually said it, the math is indisputably magical.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Meet Sarah and Ethan. Both are 15. Both have part-time jobs earning similar amounts. Sarah quietly auto-transfers $25 every paycheck into a high-yield savings account. Ethan laughs and spends every dollar on sneakers, takeout, and app purchases. Fast-forward 20 years: Sarah has $22,000+ before she's even seriously tried to invest. Ethan has.... some worn-out sneakers and memories of meals he can't quite recall. The difference wasn't income. It was one small habit started at 15."
    },
    {
      "type": "body",
      "title": "Pay Yourself First — The Rule That Changes Everything",
      "body": "The most powerful savings rule is deceptively simple: before you spend a single dollar on ANYTHING, move money to savings.\n\nNot after bills. Not after food. Not after fun money. FIRST.\n\nTarget: 20% of every dollar you receive. Get $50 for your birthday? $10 goes to savings before you even look at what you want to buy. Earn $100 doing yard work? $20 disappears to savings automatically.\n\nWhy does \"first\" matter so much? Because of a brutal truth about human psychology called present bias — our brains are hardwired to prefer rewards NOW over rewards LATER. If you wait until \"after\" you spend, the money is always gone. Taking it first removes the temptation entirely.\n\nAutomation is the superpower: set up a recurring transfer to savings on payday. When saving is automatic, you bypass willpower completely."
    },
    {
      "type": "body",
      "title": "Compound Interest: The Snowball That Feeds Itself",
      "body": "Regular interest means you earn a percentage of your starting balance every year. Compound interest means you earn interest ON your interest — your returns generate more returns, which generate more returns, endlessly.\n\nHere's why starting EARLY is the single most powerful financial move you can make in your teens:\n\nImagine a snowball rolling down a hill. The longer it rolls, the bigger it gets — and the bigger it is, the faster it grows. Time is the hill.\n\nA bank account might pay 4–5% annually. An index fund investment historically averages 7–10% annually. The numbers look small until you see what decades does to them."
    },
    {
      "type": "mathbreak",
      "title": "Math Break — The Numbers That Should Blow Your Mind",
      "body": "$100/month saved starting at age 15, at 7% average annual return:\n→ By age 65: approximately $525,000\n→ Total you actually deposited: $60,000\n→ Compound interest earned: $465,000\n\nSame $100/month, but starting at age 25:\n→ By age 65: approximately $262,000\n→ Those 10 years of delay cost you $263,000\n\nSame monthly saving. Same rate. Half the result — just because of 10 years.\n\nSimpler version: Sarah saves $25/paycheck at 4.5% in a high-yield savings account starting at 15. By 25 she has $8,400+interest. By 35 she has $22,000+interest. Ethan, starting at 25 to \"catch up,\" must save $50/paycheck to reach the same amount at 35."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check",
      "body": "High-yield savings accounts (HYSAs) currently pay around 4–5% APY at online banks like Marcus, Ally, or SoFi — compared to 0.01% at most big traditional banks. That's 400–500x more interest for moving your money to a different app.\n\nRound-up apps like Acorns automatically round every purchase up to the nearest dollar and invest the difference. Buy a $3.60 coffee? $0.40 gets invested. It sounds tiny — Acorns users average $30–$60 saved per month this way without noticing.\n\nChallenge idea: Try a \"no-spend week\" once a month. Put everything you would have spent directly into savings instead."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You get a $1,000 tax refund (or birthday windfall). Three scenarios:\n\nA) Spend it all now on something you've wanted (experiences + things).\n\nB) Save the entire $1,000 in a HYSA at 4.5% APY.\n\nC) Invest the entire $1,000 in a low-cost index fund for 10 years at ~7% avg.\n\nCalculate what options B and C would be worth in 10 years. Then decide. (Hint: Option C at 7% for 10 years = ~$1,967. Option B at 4.5% for 10 years = ~$1,553.)"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Look at your last 2 weeks of spending. Add up everything you spent on \"wants\" — not needs, just wants.\n\nNow imagine if 50% of that amount had been auto-saved instead, every week for the next 5 years.\n\nWhat would that number be? What could it buy — a car, a semester of college, a business deposit? Write the actual math. Seeing the real number is the thing that changes behavior."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 4;

-- ── Lesson 5: Budgeting ───────────────────────────────────────
UPDATE lessons SET
  title   = 'Budgeting – Your Money Plan That Actually Works',
  content = $body$Imagine your life is a video game with a limited number of lives (dollars). Most people play recklessly — no strategy, no map — and then wonder why they keep running out. Budgeting is the strategy guide. It doesn't make the game less fun; it makes sure you don't rage-quit broke at level 18 (junior year or college).$body$,
  fun_fact = 'The word "budget" comes from the Old French word "bougette" — a small leather bag used by medieval merchants to carry coins. Before apps and spreadsheets, your budget literally lived in a little pouch you could hold in one hand.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Imagine your life is a video game with a finite number of lives — those lives are your dollars. Most players go in wild: no inventory management, no plan, no map. They spend coins recklessly and wonder why they keep respawning broke. Budgeting is the strategy guide. It doesn't make the game less fun. It makes sure you don't rage-quit at level 18 (junior year, when you realize you have $6 for prom tickets). A budget isn't a cage. It's a cheat code."
    },
    {
      "type": "body",
      "title": "The 50/30/20 Rule — Simple But Powerful",
      "body": "The most famous budgeting rule is a starting point, not a law:\n\n50% → NEEDS: Rent, food, phone plan, transportation, school supplies. Things you'd genuinely suffer without.\n\n30% → WANTS: Eating out, entertainment, new clothes, games, hobbies. Things that make life great but aren't critical survival.\n\n20% → SAVINGS + DEBT REPAYMENT: This is your financial future. Always non-negotiable.\n\nFor teens with smaller incomes, a modified version works great:\n60% Spending (needs + wants combined)\n20% Short-to-medium savings (phone, car, trip)\n20% Long-term savings or investing\n\nThe split matters less than the habit: TRACK it, PLAN it, STICK to it."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check: Lauren's Amazon Discovery",
      "body": "Lauren tracked her spending in a Google Sheet for exactly 30 days. She expected to find a few extra DoorDash orders.\n\nInstead she discovered: $180/month on random Amazon \"must-haves\" she'd completely forgotten about. Most items weren't even used. She cut it to $40/month in wants, redirected the $140 to her Europe trip fund, and hit her goal 4 months earlier than planned.\n\nMoral: most people's biggest financial problem is invisible. Budgeting makes it visible."
    },
    {
      "type": "body",
      "title": "Zero-Based Budgeting: Give Every Dollar a Job",
      "body": "Regular budgeting: \"I'll try to spend less.\"\nZero-based budgeting: every single dollar in my income has a specific assignment BEFORE the month even starts.\n\nIncome: $400\n• Needs (food, bus): $150\n• Phone: $40\n• Fun/wants: $80\n• Savings goal (car): $80\n• Emergency buffer: $50\nTotal assigned: $400. Zero unaccounted dollars.\n\nWhen every dollar has a job, there's no ambiguity. You don't wonder if you can afford something — you look at the budget and know.\n\nBest tools for teens: YNAB (You Need A Budget), a color-coded Google Sheet, or even a simple Notes list with weekly tallies."
    },
    {
      "type": "mathbreak",
      "title": "Math Break — Build a Real Teen Budget",
      "body": "Monthly income: $400 (part-time job)\n\nFixed expenses:\n• Phone bill (split with parents): $30\n• Bus pass: $40\nSubtotal fixed: $70\n\nVariable needs:\n• School lunches & groceries: $80\nSubtotal needs: $150 total (37.5%)\n\nWants:\n• Eating out + entertainment: $80\n• Clothes/personal: $40\nSubtotal wants: $120 (30%)\n\nSavings:\n• Emergency fund: $30\n• Car goal: $60\n• Future investing: $40\nSubtotal savings: $130 (32.5%)\n\nTotal: $400 ✓\n\nThis is real. This works. Adjust the categories to match your actual life."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You earn $400/month. Your actual expenses look like this:\n• Phone: $60\n• Gas: $80\n• Food: $120\n• Fun: $100\n• Total: $360\n\nThat leaves $40. But you want to save $1,500 for a school trip in 12 months — that needs $125/month.\n\nYou're $85/month short. What do you cut? Walk through which expenses can flex and by how much. Is there an earning increase that would solve this faster than cutting?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Build your actual budget right now — even if it's rough.\n\nWrite your monthly income (even if it's $0 — add your allowance, birthday money averaged out, whatever comes in).\n\nList every expense. Every subscription. Every habit.\n\nThen share it with one trusted friend and ask them: \"Where do you see waste I'm not seeing?\" An outside perspective on your own budget is one of the most valuable financial conversations you can have."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 5;

-- ── Lesson 6: Banks and Your Money ───────────────────────────
UPDATE lessons SET
  title   = 'Banks and Your Money – Where It Lives and How to Keep It Safe',
  content = $body$The day you open your first real checking account feels like leveling up. The banker hands you a debit card. You feel like an adult. Two weeks later, you spend $12.50 on Taco Bell, forget your balance was $11.89, and get hit with a $35 overdraft fee. Suddenly you''re $23.11 in the negative and learning an expensive $35 lesson about how banks actually work. Let''s skip that lesson.$body$,
  fun_fact = 'FDIC stands for Federal Deposit Insurance Corporation, created after the Great Depression when over 9,000 banks FAILED and people lost their life savings overnight. The FDIC was America''s promise: "That will never happen to depositors again." It has kept that promise since 1933.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Opening your first real checking account feels like leveling up. The banker hands you a debit card. You feel adult-mode activated. Two weeks later you spend $12.50 on Taco Bell, forget your balance was $11.89, and wake up to a $35 overdraft fee. Now you're $23.11 in the negative and your bank literally charged you $35 for not having $0.61. That's not a bug in the system — that's a feature. For the bank. Today you learn how to use banks to your advantage instead of theirs."
    },
    {
      "type": "body",
      "title": "How Banks Actually Work",
      "body": "Banks aren't charities storing your money for free. They're businesses. Here's the deal:\n\nYou deposit $1,000. The bank lends most of that to other people at 7–20% interest rates (car loans, mortgages, credit cards). In return, they pay YOU 0.01–5% interest for the use of your money and promise to give it back on demand.\n\nThis works because not everyone withdrawals everything at once. Most of the time. (When they do, it's called a bank run — that's how 2008 almost collapsed the global economy.)\n\nYOUR side of the deal: the bank keeps your money safe (FDIC insured up to $250,000), gives you easy access, and provides services like transfers, payments, and occasionally a free tote bag."
    },
    {
      "type": "body",
      "title": "Account Types — Know the Difference",
      "body": "🏧 Checking Account — Your everyday spending account. Debit card access, bill pay, Zelle/Venmo connections. Usually pays 0–0.5% interest. Designed for money that moves constantly.\n\n💰 Savings Account — Where your savings LIVE. Traditional savings: 0.01–0.5% interest (basically nothing). High-yield savings at online banks (Ally, Marcus, SoFi): 4–5% APY. For money you're not spending right now, choose a HYSA every time.\n\n💳 Credit Cards — Don't confuse with debit. Credit cards BORROW money from the bank. You must repay it.\nThe only rule that matters: pay the full balance every month, every time, no exceptions. Miss it once and pay 20–30% interest. The average American carries $6,000 in credit card debt. Don't be average.\n\n🔒 FDIC Insurance — Every dollar in an FDIC-insured bank account is protected up to $250,000 by the US government. If your bank fails tomorrow, you get your money. No exceptions."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check: Tyler's Scam Wake-Up Call",
      "body": "Tyler's friend got a text: \"Your Chase account has been locked. Click here to verify: chse-secure-alert.com\"\n\nHis friend clicked. Entered their username and password. Lost $400 in 10 minutes.\n\nTyler learned the hard way what his friend forgot: Real banks NEVER ask for your password via text or email. Ever. If anything feels off about a bank message, go directly to the official app or website — never click links in texts.\n\nFDIC insures against bank failure. It does NOT protect you from your own clicks on phishing links. That money is gone."
    },
    {
      "type": "mathbreak",
      "title": "Math Break — The Cost of Banking Mistakes",
      "body": "Overdraft fee: $35 (average at big banks)\nIf you overdraft 4 times in a year: $140 in fees\nMonthly maintenance fee (if you miss the minimum balance): $12/month = $144/year\nATM fees (using out-of-network ATMs): $3–$5 per use\n\nA teen who doesn't understand their bank's rules can easily lose $200–$300/year in fees alone.\n\nSolution: Use online banks (SoFi, Ally, Chime) that charge $0 fees, pay higher interest, and have user-friendly apps. Or use a credit union in your area — member-owned, lower fees."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "You get this text at 11pm:\n\n\"ALERT: Your bank account has been temporarily suspended due to suspicious activity. Click here immediately to restore access or your account will be closed: secure-bank-alert-verify.net\"\n\nYour heart races. What do you do?\n\nA) Click the link and verify your info immediately — you can't afford to have your account suspended.\n\nB) Ignore it and go to sleep.\n\nC) Open your bank's OFFICIAL app directly (not via the link), check your balance, and call the bank's official number from the back of your card if you see anything unusual.\n\nWhich is correct — and why are the other two wrong?"
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Research three banks or financial apps — at least one traditional bank and one online bank/app.\n\nCompare:\n• Monthly fees\n• Savings interest rate\n• Overdraft policy\n• Teen/student account options\n\nWhich one would you choose for your first real account and why? The best financial decision you'll make as a teen might simply be choosing a bank with 4.5% APY instead of 0.01%."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 6;

-- ── Lesson 7: Setting Financial Goals ────────────────────────
UPDATE lessons SET
  title   = 'Setting Financial Goals – Turning Dreams into Automatic Reality',
  content = $body$Picture senior year. You want a car. You want spending money for college. Maybe you've been thinking about launching that business idea. Three real goals, three different timelines, zero plan. Most people live here — full of dreams, empty of plans. The gap between dreaming and having is a system. And the system is simpler than you think.$body$,
  fun_fact = 'Harvard Business School research found that people who write down their goals are 42% more likely to achieve them. Even more powerful: people who write goals AND share them with a committed friend achieve at a rate of 76%. Your goal needs a witness.',
  sections = $sections$[
    {
      "type": "hook",
      "title": null,
      "body": "Senior year. You want a car. College spending money. Maybe you've been sketching that business idea in your notes app for a year. Three real goals, three different timelines, zero actual plan. Most people live their whole lives right here — full of vivid dreams, empty of concrete plans. The gap between what you dream and what you actually have? It's not talent. It's not luck. It's a system. And the system is simpler than most people ever realize."
    },
    {
      "type": "body",
      "title": "SMART Goals — The Framework That Actually Works",
      "body": "A goal without a structure is just a wish. SMART goals are specific enough to act on:\n\n📌 Specific — \"Save $3,000\" not \"save more money.\" Specificity creates target clarity.\n\n📊 Measurable — You can track it with a number. \"Save $167/month\" not \"save a lot.\"\n\n✅ Achievable — Challenging but realistic given your actual income. Saving $3,000 in 3 months on a $200/month income is not achievable. 18 months is.\n\n❤️ Relevant — It matters to your real life and your real goals. A goal that doesn't connect to something you care about won't survive February.\n\n⏰ Time-Bound — Hard deadline. \"By graduation, May 1st\" — not \"someday.\"\n\nSMART goals work because they force your \"someday\" thinking into \"Tuesday\" thinking."
    },
    {
      "type": "realcheck",
      "title": "High-School Reality Check: Jamal's Gaming PC",
      "body": "Jamal, 17, wanted a $3,000 gaming PC for his streaming setup. He'd wanted it for two years and done nothing.\n\nThen he made it SMART:\n• Specific: Custom $3,000 PC build (priced out on PCPartPicker)\n• Measurable: Auto-save $140/month (he tracked it weekly)\n• Achievable: His part-time job paid $320/month; $140 was tight but possible\n• Relevant: The PC was directly tied to his streaming side hustle goals\n• Time-Bound: By graduation in 21 months\n\nHe hit the goal 2 weeks early.\n\nThe difference between wanting for 2 years and getting in 21 months was one afternoon of planning."
    },
    {
      "type": "body",
      "title": "Three Tiers of Goals — Short, Medium, and Long",
      "body": "Financial goals work on three timelines:\n\n⚡ Short-Term (under 1 year) — New sneakers, a gift, a weekend trip, a new game. Small targets that train the habit of setting and hitting goals. Save $20/week for 8 weeks = $160 goal hit.\n\n📅 Medium-Term (1–5 years) — First car, MacBook, first apartment deposit, laptop for college. Requires consistent monthly saving over months or years.\n\n🌱 Long-Term (5+ years) — College fund, investing portfolio, business seed money, retirement (yes, start NOW — see the compound interest math from Lesson 4). These feel abstract at 16 but become urgent at 25.\n\nThe trick: work all three tiers simultaneously. Short-term goals keep you motivated and build the habit. Medium-term goals give you something to see growing. Long-term goals are the real wealth builders."
    },
    {
      "type": "mathbreak",
      "title": "Math Break — What Does Any Goal Actually Cost Per Week?",
      "body": "Goal: $2,400 for a used car\nTimeline: 12 months\nMonthly needed: $200\nWeekly needed: $46\n\nGoal: $10,000 college spending fund\nTimeline: 4 years (starting freshman year)\nMonthly needed: $208\nWeekly needed: $48\n\nGoal: $500 emergency fund (your financial safety net)\nTimeline: 3 months\nMonthly needed: $167\nWeekly: $38\n\nFormula: (Goal Amount ÷ Months) = Monthly savings needed. Then divide by 4.3 for weekly. Run this math on any goal and it immediately becomes concrete instead of abstract."
    },
    {
      "type": "wywd",
      "title": "What Would You Do?",
      "body": "Set three real SMART goals for the next 12 months. Use the exact template:\n\n1. Short-term goal: \"I will save $____ for [specific thing] by [specific date] by saving $____/week.\"\n\n2. Medium-term goal: \"I will save $____ for [specific thing] by [specific date] by saving $____/month.\"\n\n3. Long-term goal: \"I will have $____ invested by age [specific age] by investing $____/month starting now.\"\n\nWrite them down. Right now. The research is clear: written goals happen. Thought-about goals stay thoughts."
    },
    {
      "type": "reflect",
      "title": "Reflection Prompt",
      "body": "Look at your three goals.\n\nWhich one scares you most — the one where you actually think \"that might be too ambitious for me\"?\n\nThat's the one to chase hardest. The fear usually means it matters. And goals that matter are the ones that change your trajectory.\n\nWrite one paragraph about what your life looks like in 5 years if you actually hit all three. Be specific — where do you live, what do you drive, what are you working on? The clearer the vision, the more powerful the pull."
    }
  ]$sections$
WHERE school_id = 1 AND lesson_number = 7;


-- ─── Per-Lesson Chapter Quiz Questions ───────────────────────
-- 3 questions per lesson, linked by lesson_id (school-wide quiz uses lesson_id IS NULL)

-- Lesson 1 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 1),
 'What was the main problem with the barter system that led to the invention of money?',
 'multiple_choice',
 '["It was too slow to count goods", "You had to find someone who had what you needed AND wanted what you had", "Goods would spoil before a trade could happen", "Only wealthy people could participate in barter"]'::jsonb,
 'You had to find someone who had what you needed AND wanted what you had',
 'The "double coincidence of wants" made barter extremely inefficient — you needed a perfect two-way match. Money solved this by making any exchange possible without needing a perfect swap partner.',
 'easy', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 1),
 'After President Nixon''s 1971 decision, the US dollar became "fiat money." What does that mean?',
 'multiple_choice',
 '["The dollar is backed by gold reserves", "The dollar''s value comes from government trust, not a physical commodity", "The dollar is now a digital currency", "The government can only print a limited amount of money"]'::jsonb,
 'The dollar''s value comes from government trust, not a physical commodity',
 'Nixon closed the gold window, ending the Bretton Woods system. Fiat money (from Latin "fiat" = let it be done) has value because governments declare it legal tender and everyone accepts it — not because it''s backed by gold or silver.',
 'medium', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 1),
 'Which three functions does money serve in every economy throughout history?',
 'multiple_choice',
 '["Barter, trade, invest", "Medium of exchange, store of value, unit of account", "Earning, spending, saving", "Liquid, fixed, digital"]'::jsonb,
 'Medium of exchange, store of value, unit of account',
 'These three functions define what makes something "money": it must facilitate trades (medium of exchange), hold value over time (store of value), and let people compare prices (unit of account). Every form of money — shells, coins, crypto — must serve all three.',
 'easy', 3);

-- Lesson 2 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 2),
 'Mia left her $15/hr retail job and started earning $600/month doing what?',
 'multiple_choice',
 '["Selling handmade jewelry on Etsy", "Creating prom highlight video reels using CapCut", "Tutoring classmates in math after school", "Running a DoorDash delivery route"]'::jsonb,
 'Creating prom highlight video reels using CapCut',
 'Mia learned video editing for free on YouTube and offered prom highlight reels at $75 each — a skill-based service. Her story illustrates how adding a marketable skill can multiply your earning power without adding more hours.',
 'easy', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 2),
 'True or False: Commission-based pay means you earn a fixed hourly rate no matter how much you sell.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'Commission pay means you earn based on what you sell — usually a percentage of the sale. If you sell a lot, you earn a lot. If you sell nothing, you earn nothing. It creates an unlimited ceiling but also the possibility of zero income from low-performing periods.',
 'easy', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 2),
 'If you earn $200/week and auto-save 20%, how much will you have saved after one full year without trying?',
 'multiple_choice',
 '["$960", "$1,560", "$2,080", "$2,400"]'::jsonb,
 '$2,080',
 '$200 × 20% = $40/week. $40 × 52 weeks = $2,080. This is the power of "pay yourself first" automation — the savings happen before you have a chance to spend it, requiring zero daily willpower.',
 'medium', 3);

-- Lesson 3 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 3),
 'Jake spent $180 on a Supreme tee that he later saw reselling for $120. What financial concept does this best illustrate?',
 'multiple_choice',
 '["Inflation eroding purchasing power", "Opportunity cost of spending instead of saving", "The barter system in action", "Compound interest working against him"]'::jsonb,
 'Opportunity cost of spending instead of saving',
 'Opportunity cost is what you give up by choosing one option over another. Jake''s real loss wasn''t just $180 — it was the $180 not applied to his car goal, which would have provided months of freedom and saved transportation costs far exceeding $180.',
 'medium', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 3),
 'What is the "24-hour rule" for spending?',
 'multiple_choice',
 '["You have 24 hours to return any purchase", "Wait 24 hours before buying anything non-essential over $20", "Pay all bills within 24 hours of receiving them", "Track every purchase for 24 hours after making it"]'::jsonb,
 'Wait 24 hours before buying anything non-essential over $20',
 'The 24-hour rule is a simple speed bump against impulse buying. Research shows that 80% of impulse purchase urges fade within 24 hours. The rule gives your rational brain time to override your dopamine-driven impulse brain.',
 'easy', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 3),
 'Spending $5 every day on energy drinks equals approximately how much per year?',
 'multiple_choice',
 '["$365", "$730", "$1,825", "$3,650"]'::jsonb,
 '$1,825',
 '$5 × 365 days = $1,825/year. This math exercise isn''t about condemning energy drinks — it''s about making invisible spending habits visible. Most teens don''t realize daily small purchases add up to thousands annually.',
 'easy', 3);

-- Lesson 4 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 4),
 'If you save $100/month starting at age 15 at 7% annual return, approximately how much will you have by age 65?',
 'multiple_choice',
 '["$72,000 (just what you deposited)", "$150,000", "$262,000", "$525,000"]'::jsonb,
 '$525,000',
 'Compound interest over 50 years is dramatically powerful. You deposit $60,000 total ($100 × 12 months × 50 years), but compound growth turns it into ~$525,000. The interest earns interest, which earns interest — exponential growth over time.',
 'medium', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 4),
 'What is "present bias" and why does it matter for saving?',
 'multiple_choice',
 '["Preferring to save in the present rather than the future", "Our brain''s tendency to prefer immediate rewards over larger future rewards", "The bias of financial advisors toward current market conditions", "Spending more money in the present than you did in the past"]'::jsonb,
 'Our brain''s tendency to prefer immediate rewards over larger future rewards',
 'Present bias is a well-documented psychological phenomenon: given the choice between $10 now or $20 next month, many people take the $10. This is why "pay yourself first" automation is so powerful — it removes the willpower battle by making saving automatic before present-bias can intervene.',
 'medium', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 4),
 'True or False: Starting to save 10 years later (at 25 instead of 15) roughly cuts your final retirement balance in half, even with identical monthly contributions.',
 'true_false',
 '["True", "False"]'::jsonb,
 'True',
 'This is the core lesson of compound interest timing. $100/month from age 15 → ~$525,000 at 65. Same $100/month from age 25 → ~$262,000 at 65. Those 10 years cost approximately $263,000. Time in the market is the single most powerful variable in long-term wealth building.',
 'easy', 3);

-- Lesson 5 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 5),
 'In the 50/30/20 budgeting rule, what does the 20% represent?',
 'multiple_choice',
 '["Entertainment and dining out", "Savings and debt repayment", "Housing and transportation", "Groceries and essentials"]'::jsonb,
 'Savings and debt repayment',
 'The 50/30/20 rule: 50% needs (rent, food, transportation), 30% wants (entertainment, dining, hobbies), 20% savings and debt repayment. The 20% is non-negotiable — it''s your future financial security built one paycheck at a time.',
 'easy', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 5),
 'What is "zero-based budgeting"?',
 'multiple_choice',
 '["Only spending money when your bank balance is near zero", "Having zero money left at the end of the month", "Assigning every dollar of income a specific job before the month begins", "Starting your budget from scratch every year"]'::jsonb,
 'Assigning every dollar of income a specific job before the month begins',
 'Zero-based budgeting means income minus all assigned expenses, savings, and goals = zero. Every dollar is intentionally directed. It eliminates the "mystery money" that disappears without you knowing where it went.',
 'medium', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 5),
 'Lauren tracked her spending for 30 days and found she was hemorrhaging $180/month on what?',
 'multiple_choice',
 '["DoorDash delivery fees", "Random Amazon impulse purchases she''d forgotten about", "Streaming subscriptions she no longer used", "Gas and transportation costs"]'::jsonb,
 'Random Amazon impulse purchases she''d forgotten about',
 'Lauren''s story is relatable because most "invisible" spending is online. The one-click convenience of Amazon, the algorithmic recommendations, and the small individual amounts make this category uniquely easy to overspend without realizing it.',
 'easy', 3);

-- Lesson 6 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 6),
 'FDIC insurance protects your money in an insured bank up to how much per person?',
 'multiple_choice',
 '["$25,000", "$100,000", "$250,000", "$1,000,000"]'::jsonb,
 '$250,000',
 'The FDIC (Federal Deposit Insurance Corporation) insures deposits up to $250,000 per depositor, per insured bank. Created after the Great Depression, it guarantees you''ll always get your money back even if the bank collapses. For most people, one bank account is fully protected.',
 'easy', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 6),
 'What is the critical difference between a debit card and a credit card?',
 'multiple_choice',
 '["Debit cards are only for stores; credit cards work online", "Debit spends money you already have; credit borrows money you must repay", "Debit cards earn rewards; credit cards charge fees", "Debit cards are for adults only; credit cards are for teens"]'::jsonb,
 'Debit spends money you already have; credit borrows money you must repay',
 'Debit cards draw directly from your bank balance — you can only spend what you have. Credit cards borrow from the bank with a promise to repay. Carrying a balance (not paying in full monthly) triggers 20-30% interest, turning a $100 purchase into $130+ over time.',
 'easy', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 6),
 'True or False: A real bank will sometimes ask you for your password via a text message to verify your identity.',
 'true_false',
 '["True", "False"]'::jsonb,
 'False',
 'Legitimate banks NEVER ask for your password, PIN, or full account credentials via text, email, or phone call. Any message asking for this information is a phishing scam. Always navigate directly to your bank''s official app or website — never via links in unsolicited messages.',
 'medium', 3);

-- Lesson 7 Quiz Questions
INSERT INTO quiz_questions (school_id, lesson_id, question_text, question_type, options, correct_answer, explanation, difficulty, order_number)
VALUES
(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 7),
 'Jamal''s goal to save $3,000 for a gaming PC by graduation in 21 months is a great example of what?',
 'multiple_choice',
 '["An unrealistic dream", "A SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)", "A long-term investing strategy", "A needs-based budget item"]'::jsonb,
 'A SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)',
 'Jamal''s goal checks all five SMART boxes: Specific (exact PC at exact price), Measurable ($140/month tracked weekly), Achievable (tight but possible on his income), Relevant (directly tied to his streaming goals), Time-bound (by graduation). The SMART framework is what separated his 2-year-old dream from a 21-month achievement.',
 'easy', 1),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 7),
 'In a SMART goal, what does the "T" (Time-bound) component represent?',
 'multiple_choice',
 '["The type of goal (short, medium, or long-term)", "A tracked progress system with weekly check-ins", "A specific deadline that creates urgency and accountability", "The total amount of money needed"]'::jsonb,
 'A specific deadline that creates urgency and accountability',
 'Time-bound means your goal has a hard deadline — not "someday" or "eventually," but "by May 1st" or "by graduation." A deadline transforms vague intentions into concrete plans and creates the urgency needed to take action today rather than postponing indefinitely.',
 'easy', 2),

(1,
 (SELECT id FROM lessons WHERE school_id = 1 AND lesson_number = 7),
 'What saving behavior makes reaching financial goals much easier because it removes the need for daily willpower?',
 'multiple_choice',
 '["Carrying cash instead of a debit card", "Automation — setting up automatic transfers on payday", "Reviewing your budget daily", "Telling your parents about your goals"]'::jsonb,
 'Automation — setting up automatic transfers on payday',
 'Automation transfers money to savings the moment you get paid — before you can spend it or talk yourself out of it. Behavioral economics research consistently shows that automated saving dramatically outperforms manual saving because it eliminates the psychological friction and daily willpower required to make the right choice every single time.',
 'medium', 3);
