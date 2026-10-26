# Unfeed Handoff

Updated 26 Oct 2026. A new Claude chat should read this first, then `AGENTS.md`, then pick up from "What's next".

## What it is
An iPhone app that opens Instagram and LinkedIn with the feeds removed. Built for me (Denis), so I can message people without getting sucked into scrolling.

- **Instagram** opens straight to DMs. Tabs: Stories, DMs, Search, Post, Profile.
- **LinkedIn** opens to Messages. Tabs: Profile, Messages, Search, Post, Notifications.
- **Top bar (both):** Link, QR (LinkedIn only), the app switcher, Settings.
- **Blocked:** only the feeds: Instagram home, the Reels tab and the Explore grid, and LinkedIn's home feed. Everything else works normally. They're stopped at the navigation level and also hidden with injected CSS as a backup.
- **Switching:** a pill at the top flips between the two apps. Both keep their place.
- **Settings:** a settings screen with a separate logout for each service.
- **No-app version:** the same blocking rules also ship as Safari and desktop userscripts (the "home screen method").

## Where it came from
Built overnight on 10 Oct 2026 with Obvious (obvious.ai Autobuild) during a hackathon. I ran out of Obvious credits, so work continues in Claude. All the code is in this repo.

## Stack
- Expo SDK 58 (React Native, TypeScript, Expo Router).
- On SDK 58 because that's what the App Store's Expo Go runs (moved from 57 on 23 Oct 2026, when Expo Go stopped opening 57). Only change it when Expo Go changes.
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
- 15 Oct: the app now runs without my PC. It is linked to my Expo account (`denispopov`, project `@denispopov/unfeed`) and published with EAS Update on branch `main`, runtime `exposdk:58.0.0` (was 57 until 23 Oct) so Expo Go can open it. `expo-updates` was added for this. Publish a new version with `npm run publish:phone`. README "Get it on your iPhone (no PC needed)" has the phone steps.
- On Windows, 2 userscript unit tests and expo-doctor's `ios.icon` check fail locally because of CRLF line endings and the `.icon` folder. They pass in CI on Linux, which is the source of truth.
- 15 Oct (PR #14): hidden frames (Facebook login sync, trackers) no longer open Safari. Only a link I tap to another site goes to Safari.
- 16 Oct: my phone test feedback, built while I was away:
  - Instagram's own bars and "get the app" banners are hidden by a sweep that finds the links by their icon labels (the site has no nav element). See ASSUMPTIONS 25.
  - Instagram bar is now Search, DMs, **Post**, Profile. Post presses Instagram's own hidden New post control (ASSUMPTIONS 26). Not yet confirmed on my phone.
  - LinkedIn uses **its own** top and bottom bars, with Home and every feed link hidden. Notifications and My Network are allowed. Unfeed's LinkedIn bottom bar is gone (the old Search bar and recent searches code is unused now, kept until I say it can go). QR moved to the header's left button, with a Close button. (Replaced on 25 Oct by the app's own bars, which use the search bar code again.)
  - QR "My code" was empty because LinkedIn no longer moves /in/me/ to my real profile URL. The app now reads it from the edit links on my own profile (ASSUMPTIONS 28), and the empty state points to Settings to type it in.

- 23 Oct: Expo Go on the App Store moved to SDK 58 and stopped opening the app, so the project moved to SDK 58 (PR #16).
- 23 Oct: my phone feedback (sent through Grok), built while I was away, see ASSUMPTIONS 30 to 34. Not yet checked on my phone:
  - DM videos: sound plays even on silent, videos stay in the page instead of flipping to full screen.
  - Stories button: shows only the story circles, never the feed.
  - Link button in the header: paste an Instagram or LinkedIn link and it opens here.
  - LinkedIn get the app banner and pop-up are hidden or closed.
  - Posting: Instagram Post shows a small sheet with "Choose photo or video"; LinkedIn has a Post button next to QR.

- 25 to 26 Oct: overnight build from my list (PRs 19 to 27), all merged with every check green and published to my phone. Not yet checked on my phone. See `MORNING.md` for the phone checklist.
  - PR 20: Expo released new SDK 58 patch versions, which broke the expo-doctor check, so they were bumped first. Still SDK 58.
  - PR 19: single posts and reels always open (rules `ig-9-single-post`, `li-8-single-post`), so Your activity no longer jumps to Messages. `/reels/<code>/` goes to the single reel page. The "Open friends' shared posts" switch is gone (it did nothing after this).
  - PR 21: LinkedIn post cards are hidden only on the feed itself. Profile Activity, Recent activity pages and single posts show.
  - PR 22: Stories never shows Instagram home. A hidden web view loads home under an opaque native screen, reads the story tray, and the app draws its own circles. Tapping one opens that person's stories.
  - PR 23: Instagram videos get their sound when they start (Instagram's own sound button, or unmuting directly), once per video. If I mute anything myself, the app stops touching sound.
  - PR 24: the Settings gear is a proper gear.
  - PR 25: Profile at the bottom left of LinkedIn's bar (later replaced by the app's own bar in PR 27).
  - PR 26: Settings > Blocked pages lists the last 20 redirects and blocks with time, address and rule id.
  - PR 27: the app's own top bar and tab bar on both apps, LinkedIn's own bars hidden (kept in the Safari userscript), page colours set through the sites' own colour variables, tighter tokens, Settings on the shared top bar, new screenshots.
  - Two updates were published: Part 1 only (update group `86d23975`), then Part 1 plus the new look (`9a7bb74d`, the current one). If I don't like the new look, the Part 1 only update can be put back.

## Known limits (not bugs)
- **It runs inside Expo Go, not as its own app.** A standalone app with its own icon needs a paid Apple developer account ($99 a year), which I don't have.
- **Keep the update runtime on `sdkVersion`.** Expo Go only opens updates marked with its own SDK (`exposdk:58.0.0` now). The next SDK move happens when the App Store Expo Go moves.
- No push notifications from either site.
- Some voice notes or media may not play inside the web views.
- Google and Facebook login buttons often fail inside the app. Use username and password instead.
- Both sites change their pages often, so the hide rules may need updating over time (`AGENTS.md` explains how). If a page bounces, Settings > Blocked pages shows which rule did it.
- Each tab remembers its page, but not how far down it was scrolled (still one web view per app).
- How close the page colours get to the app's depends on the sites' own colour settings; only the phone can show it.

## What's next
1. **Me, on my phone:** first-time setup and testing, following `DENIS_TODO.md` and README "Get it on your iPhone (no PC needed)":
   - log in as `denispopov` in Expo Go and open unfeed from Projects
   - log into Instagram and LinkedIn inside the app
   - test the LinkedIn QR scanner with the camera
   - try the Safari userscripts home screen method
2. **Fix whatever breaks** in step 1. Expect selector or route tweaks once it's running against the real sites.
3. ~~Solve the "PC must be on" problem.~~ Done 15 Oct with EAS Update into Expo Go (see Status). After any code change, run `npm run publish:phone` so the phone gets it.
4. **Check the 16 Oct changes on my phone:** Instagram bars and banner gone, Post opens the create screen, QR My code fills in after opening my own profile once.
5. **Check the 25 Oct overnight build on my phone** with the checklist in `MORNING.md`, and say whether the new look is a keeper.

## Rules for working on this
- Read `AGENTS.md` before touching code. Expo changes a lot, so check the SDK 58 docs instead of relying on memory.
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
