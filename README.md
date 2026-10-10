# Unfeed

Instagram and LinkedIn with no feed. Unfeed opens the real mobile websites of Instagram and LinkedIn inside one app, jumps straight to your messages, and blocks the feed, reels and explore pages at the navigation level. You log in once inside the app with your normal accounts, the same as using Safari. There are no private APIs, no scraping and no automation of either service.

## Expo SDK this project uses

This project uses Expo SDK 57.

Why: the Expo Go app on the Apple App Store was updated in September 2026 and now supports SDK 57 (App Store version 57.0.9, September 2, 2026). SDK 58 exists only as a beta. So SDK 57 is the newest SDK that the Expo Go app from the App Store can run. Checked October 10, 2026. Expo Go can only run one SDK version at a time, so keep this project on SDK 57 until you deliberately upgrade.

## Run it on your iPhone tonight

You need a Windows PC, an iPhone, and about 20 minutes.

1. On the PC, install Node.js LTS from nodejs.org if you do not have it.
2. Download this repo: click the green Code button, choose Download ZIP, then unzip it, for example to C:\\Users\\Denis Popov\\Documents\\claude-workspace\\unfeed.
3. Open Command Prompt in that folder: click the folder in File Explorer, type cmd in the address bar, press Enter.
4. In Command Prompt run: npm install
5. Make a free account at expo.dev if you do not have one. The Expo Go app now requires a login to run projects (new since September 2026).
6. In Command Prompt run: npx expo login
   Log in with the same account in the browser window that opens.
7. In Command Prompt run: npx expo start --tunnel
   Leave that window open.
8. On the iPhone: install "Expo Go" from the App Store. Open Expo Go, tap the avatar in the top right corner, log in with the same account.
9. Scan the QR code shown in Command Prompt with the iPhone camera. The app loads in Expo Go.
10. Log into Instagram and LinkedIn once inside the app. Use your username and password: the Google and Facebook sign in buttons often refuse to work inside app web views.
11. If Instagram or LinkedIn show a security check like "Was this you?", approve it in the app or by email. That is normal for a new login, not a bug.

## What is in this build so far

This is the T0 scaffold: the Expo app builds, the web preview builds, and the test and CI setup is in place. The Instagram and LinkedIn screens, the route guard and the feed blocking land in the next tickets.

## Commands

| Command | What it does |
|---|---|
| npm start | Starts the Expo dev server |
| npm run web | Builds the web preview into dist/ |
| npm test | Runs the unit tests (jest) |
| npm run test:inject | Runs the Playwright tests for the injected scripts |
| npm run test:screens | Runs the Playwright screenshot tests of the web preview |
| npm run build:inject | Bundles the route rules and hide CSS into the injected scripts |
| npm run typecheck | Runs tsc --noEmit |

## Tracking files

- DENIS_TODO.md: steps only Denis can do
- BLOCKERS.md: blocked items and workarounds
- ASSUMPTIONS.md: decisions taken while building
- PROGRESS.md: one line per merged PR
