# WealthWiseKids iPhone Testing Roadmap

Date target: Tomorrow
Branch: testing/sdk55-qa
Goal: Install and run iOS dev build on iPhone, test all critical flows, and capture actionable bug reports.

## 1) Tonight Prep (20-30 min)

1. Confirm branch is up to date:
- git checkout testing/sdk55-qa
- git pull

2. Confirm app dependencies:
- cd app
- npm install

3. Confirm backend dependencies:
- cd ../backend
- npm install

4. Create backend env file:
- Copy backend/.env.example to backend/.env
- Fill:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY (test key is fine)
  - STRIPE_WEBHOOK_SECRET (can be placeholder for local)
  - PLAID keys (or leave unused if not testing Plaid)

5. Create app env file:
- Copy app/.env.example to app/.env
- Fill:
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY
  - EXPO_PUBLIC_API_URL

6. Set API URL for iPhone access:
- Do not use localhost
- Use your computer LAN IP, example:
  - EXPO_PUBLIC_API_URL=http://192.168.0.67:3001

7. Keep a simple bug tracker ready:
- Google Sheet or Notion table with columns:
  - ID
  - Time
  - Screen
  - Steps
  - Expected
  - Actual
  - Severity (P0/P1/P2)
  - Screenshot link
  - Console log snippet
  - Status

## 2) iPhone Install (Dev Client) (30-60 min)

1. Install EAS CLI:
- npm i -g eas-cli

2. Configure once in app folder:
- cd app
- eas login
- eas build:configure

3. Register your iPhone:
- eas device:create
- Complete the Apple device registration flow on your phone.

4. Build iOS development client:
- eas build --profile development --platform ios

5. Install the resulting build on your iPhone:
- Open the Expo build URL on iPhone and install.

## 3) Start Local Services Tomorrow (10 min)

1. Start backend:
- cd backend
- npm run dev
- Verify health endpoint in browser:
  - http://YOUR_LAN_IP:3001/health

2. Start app metro for dev client:
- cd app
- npx expo start --dev-client

3. Open installed app on iPhone:
- Make sure iPhone and computer are on same Wi-Fi.

## 4) Test Execution Plan (90-120 min)

Run these in order and log all issues.

### A. Auth and Setup
1. Sign up parent account
2. Sign in
3. Create child profile
4. Verify child appears in app

### B. Learning Flow
1. Open lesson hub
2. Complete a chapter quiz pass
3. Verify coin award popup appears
4. Verify badge modal appears when eligible
5. Verify progress updates in Progress screen

### C. Store and Rewards
1. Open Store
2. Pull to refresh
3. Verify loading skeleton and empty states where relevant
4. Test monthly bonus behavior (if applicable)
5. Test buy flow for a tool (if enough coins)

### D. Reports and Budget
1. Open Progress screen and verify badges/schools rendering
2. Open Spending Reports and verify empty/report states
3. Open Parent Reports and verify no-data states

### E. Form UX / Device UX
1. Check keyboard overlap on all forms
2. Check haptic feedback on main button actions
3. Check animations do not stutter

## 5) Issue Triage Rules

1. P0:
- Crash
- Cannot sign in
- Cannot create child
- Cannot load core screens

2. P1:
- Data wrong or missing after successful action
- Reward/badge logic incorrect
- Purchases fail unexpectedly

3. P2:
- Visual issues
- Minor haptic/animation inconsistencies
- Non-blocking copy/UI issues

## 6) Evidence Collection Standards

For every bug, capture:
1. Repro steps (numbered)
2. Screenshot or short screen recording
3. Timestamp (local time)
4. Terminal logs around that time from:
- backend terminal
- expo metro terminal
5. Child/user ID if relevant

## 7) End-of-Day Wrap

1. Group bugs by screen and severity
2. Create top-10 fix list for next session
3. Open one GitHub issue per P0/P1 bug
4. Keep P2 issues in one consolidated UI polish issue

## 8) Quick Command Reference

Backend:
- cd backend
- npm run dev

App:
- cd app
- npx expo start --dev-client

iOS build:
- cd app
- eas build --profile development --platform ios

## 9) Success Criteria for Tomorrow

1. App installs on iPhone via dev client
2. You can complete at least one full learning loop:
- Sign in -> Learn -> Quiz -> Coins/Badges -> Progress update
3. You leave with a prioritized bug list (P0/P1/P2) and reproducible evidence
