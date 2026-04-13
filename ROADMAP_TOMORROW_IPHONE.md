# Tomorrow Roadmap - iPhone Testing and Release Setup

Goal: Run WealthWiseKids on iPhone, complete a smoke test, log issues, and decide beta distribution path.

## Important Cost Clarification

Apple Developer Program is 99 USD per year, not per month.

- Required for TestFlight and App Store distribution.
- Not required to run local simulator/emulator.
- For iPhone device install using EAS development builds, Apple signing access is still needed.

## A) Tonight Prep (10-15 min)

1. Confirm branch:
- git checkout testing/sdk55-qa
- git pull

2. Confirm env files exist:
- backend/.env
- app/.env

3. Confirm local API IP in app env:
- EXPO_PUBLIC_API_URL=http://192.168.0.67:3001

4. Keep these ready:
- Supabase project open
- Stripe test keys open
- Bug tracker template: TEST_BUG_TRACKER_TEMPLATE.csv

## B) Tomorrow Morning Startup (10 min)

1. Start backend:
- cd backend
- npm run dev

2. Validate backend:
- open http://127.0.0.1:3001/health
- expected response: status ok

3. Start app dev server:
- cd app
- npx expo start --dev-client

4. Confirm dev client deep link shows exp+wealthwisekids://

## C) iPhone Run Path (Choose one)

### Path 1: You already have a dev build installed

1. Open installed WealthWise dev app on iPhone.
2. Ensure iPhone and laptop are on same Wi-Fi.
3. Connect to Metro and run the app.

### Path 2: You do not have a dev build installed yet

1. In app folder:
- eas login
- eas build:configure
- eas device:create
- eas build --profile development --platform ios

2. Open the build link on iPhone and install.
3. Relaunch Metro:
- npx expo start --dev-client

## D) Smoke Test Checklist (30-45 min)

1. Auth:
- Sign up/sign in works
- No stuck spinner

2. Child profile:
- Create child profile
- Child appears in session

3. Learning loop:
- Open lesson hub
- Complete one quiz
- Coin pop appears
- Badge modal appears when eligible

4. Store:
- Open store
- Pull-to-refresh works
- Empty states/skeletons render correctly

5. Progress/Reports:
- Progress loads
- No crash on badges
- Parent/Spending reports render empty states correctly

6. Device UX:
- Haptics trigger on key actions
- Keyboard does not cover inputs

## E) Issue Logging Rules

For each bug, capture:
1. Screen name
2. Steps to reproduce
3. Expected vs actual
4. Timestamp
5. Screenshot or recording
6. Severity:
- P0 crash/blocker
- P1 wrong behavior/data
- P2 UI polish

Use file: TEST_BUG_TRACKER_TEMPLATE.csv

## F) Beta Decision Matrix

1. Free internal testing now:
- Use EAS development builds and direct install links
- Good for small trusted tester set

2. Public-like beta:
- Use TestFlight (requires Apple Developer Program)
- Best for non-technical testers

## G) End-of-Day Deliverables

1. Top 5 P0/P1 bugs
2. Fix list for next coding session
3. Decide distribution path:
- Continue dev builds only
- Or move to TestFlight
