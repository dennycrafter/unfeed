# Unfeed Handoff

Updated 15 Oct 2026. A new Claude chat should read this first, then `AGENTS.md`, then pick up from "What's next".

## What it is
An iPhone app that opens Instagram and LinkedIn with the feeds removed. Built for me (Denis), so I can message people without getting sucked into scrolling.

- **Instagram** opens straight to DMs. Tabs: Search, DMs, Profile, plus a Stories button.
- **LinkedIn** opens to Messages. Tabs: Messages, Search, QR, Profile.
- **Blocked:** Feeds, Reels and Explore. They're stopped at the navigation level and also hidden with injected CSS as a backup.
- **Switching:** a pill at the top flips between the two apps. Both keep their place.
- **Settings:** a settings screen with a separate logout for each service.
- **No-app version:** the same blocking rules also ship as Safari and desktop userscripts (the "home screen method").

## Where it came from
Built overnight on 10 Oct 2026 with Obvious (obvious.ai Autobuild) during a hackathon. I ran out of Obvious credits, so work continues in Claude. All the code is in this repo.

## Stack
- Expo SDK 57 (React Native, TypeScript, Expo Router).
- Pinned to SDK 57 because that's what the App Store's Expo Go runs. Do not upgrade.
- Runs inside the **Expo Go** app. It's not on the App Store.
- One source of truth for blocking: `src/rules/*.json` plus `src/rules/decide.ts`. The app, the injected scripts and the userscripts all use it. Details are in `AGENTS.md`.

## Status (checked 15 Oct)
- Every planned ticket (T0 to T6) is done and merged (PRs 1 to 9).
- Full CI is green on `main`:
  - 370 of 370 unit tests
  - Playwright inject and screen tests
  - type check
  - lint
  - expo-doctor
- 15 Oct: Expo released new SDK 57 patch versions, which made CI's `expo-doctor` check fail. PR #12 bumped expo to ~57.0.30 plus the matching patches. CI is green again. Still SDK 57.
- `BLOCKERS.md` is empty.
- **Ignore branch `stretch/s1`** (Instagram "My code" QR). I never asked for it, so don't merge it.

## Known limits (not bugs)
- **The app needs my PC on to run.** Expo Go loads the app from my PC, which must be on with `npx expo start --tunnel` running. My PC is usually off, so this is the biggest practical problem.
- No push notifications from either site.
- Some voice notes or media may not play inside the web views.
- Google and Facebook login buttons often fail inside the app. Use username and password instead.
- Both sites change their pages often, so the hide rules may need updating over time (`AGENTS.md` explains how).

## What's next
1. **Me, on my phone:** first-time setup and testing, following `DENIS_TODO.md` and README "Get it on your iPhone tonight":
   - make an expo.dev account and log in on the PC and in Expo Go
   - log into Instagram and LinkedIn inside the app
   - test the LinkedIn QR scanner with the camera
   - try the Safari userscripts home screen method
2. **Fix whatever breaks** in step 1. Expect selector or route tweaks once it's running against the real sites.
3. **Solve the "PC must be on" problem.** Options to look into:
   - an EAS development build plus EAS Update. This needs an `EXPO_TOKEN`, and installing on iPhone may need an Apple developer account, which I don't have.
   - leaning on the Safari userscripts method instead, which needs no PC.
   Explain the options to me simply before doing anything.

## Rules for working on this
- Read `AGENTS.md` before touching code. Expo changes a lot, so check the SDK 57 docs instead of relying on memory.
- Change blocking only through `src/rules/` and `src/inject/`, then run `npm run build:inject`. Never hand-edit generated files.
- Before calling anything done, run `npm test`, `npm run test:inject`, `npm run typecheck` and `npm run lint`.
- One branch and one PR per change, squash merge when green.
- Only use libraries Expo Go already includes (the list is in `AGENTS.md`).
- I'm non-technical. Anything I have to do goes as short numbered steps at the end.
- No em dashes or en dashes anywhere.

## Key files
- `README.md`: setup and daily use, written for me
- `AGENTS.md`: how the code works and the rules for agents
- `DENIS_TODO.md`: the steps only I can do
- `REPORT.md`: the overnight build report
- `PROGRESS.md`, `ASSUMPTIONS.md`, `BLOCKERS.md`: build tracking
- `docs/screenshots/`: every screen at phone size
