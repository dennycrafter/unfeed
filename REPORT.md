# Unfeed overnight build report

Written 2026-10-10 at the end of the overnight run. Everything below reflects what is on `main` right now.

## What was built

Unfeed is ready to use tonight. It is an Expo app (React Native, TypeScript, SDK 57) that wraps the real Instagram and LinkedIn mobile websites in one dark app shell and removes the parts built to make you scroll. You switch between the two services with a pill at the top, both keep their state, and your normal logins work exactly like in Safari. Instagram opens straight to your DMs with native tabs for Search, DMs and Profile plus a Stories button. LinkedIn opens to Messages with native tabs for Messages, Search, QR and Profile. Feeds, Reels, Explore and feed style search results are blocked at the navigation level and hidden with injected styles as a second layer. A QR tab scans LinkedIn codes and shows yours. The same blocking rules also ship as Safari and desktop userscripts for the no-app home screen method.

## Tickets

- T0 scaffold: done. Expo SDK 57 app shell, all Expo Go safe libraries installed, test runners wired, CI on every PR.
- T1 tracer bullet: done. WebView host, Instagram DMs on open, the full Instagram route table live, first parity tests.
- T2 Instagram: done. Native tabs, header and stories flow, hide CSS for the feed, grid and banners, unread badge, username detection.
- T3 LinkedIn: done. Native tabs, people search with recent searches, profile vanity detection, hide CSS, unread badge.
- T4 QR: done. Camera scanner with a plain permission explainer, code classification, My code screen with share.
- T5 switcher, settings and state: done. Both hosts stay mounted when switching, last app remembered, settings screen with per service logout, haptics, toasts.
- T6 userscripts and handoff: done. Userscripts generated from the same rules as the app, CI refuses stale generated files, README and AGENTS.md rewritten, tracking files finalised.

No ticket ended with a blocker. BLOCKERS.md says the same.

## Tests

- Unit (Jest): 370 passed, 370 total.
- Injected script fixtures (Playwright): 23 passed, 23 total.
- Screen screenshots at 390x844 plus QA size (Playwright): 29 passed, 29 total.
- Type check, lint, expo-doctor (21 of 21 checks) and the web export all pass.
- Every PR 1 through 8 merged with green CI. Generated userscripts are rebuilt in CI and the build fails if anyone hand edits them.
- Rule parity is tested in three places: native decide(), the injected matcher and the userscript matcher all answer the same for the full URL tables of both sites.

## Pull requests merged

- PR 1 (T1) Instagram DMs tracer bullet behind the route guard
- PR 2 (T3) full LinkedIn experience behind the shared route guard
- PR 3 (T2) full Instagram experience behind the shared route rules
- PR 4 (T4) QR scanner and My code
- PR 5 progress line for the T2 merge
- PR 6 progress line for the T4 merge
- PR 7 (T5) app switcher state, settings screen and persistence
- PR 8 (T6) Safari and desktop userscripts from the shared rules, plus handoff docs

## Screenshots

All in `docs/screenshots/`, taken from the web preview at 390x844, with a second set at the 720 pixel QA size:

- t1-instagram-dms, t2-instagram-dms, t2-instagram-search, t2-instagram-profile, t2-instagram-stories
- t3-linkedin-messages, t3-linkedin-search, t3-linkedin-profile
- t4-qr-scanner-explainer, t4-qr-scan-result-sheet, t4-qr-my-code, t4-qr-my-code-empty
- t5-switcher-instagram, t5-switcher-linkedin, t5-switcher-720, t5-settings

## What Denis needs to do

Short numbered steps. The same list lives in DENIS_TODO.md.

1. When you first run the app, the current Expo Go asks you to log in (new rule since September 2026). Make a free account at expo.dev. Log in on the PC with `npx expo login` and inside Expo Go with the same account. Full steps are in README.
2. Log into Instagram and LinkedIn once inside the app, with your username and password. The Google and Facebook sign in buttons often refuse to work inside app web views. If Instagram or LinkedIn show a check like "Was this you?", approve it. That is normal, not a bug.
3. Optional, later only: an Expo access token (EXPO_TOKEN) is needed for EAS builds and updates (stretch items S7 and S8). Not needed tonight.
4. Only you can test the camera on your phone, because the simulator and the web preview have no camera. After installing the app on your iPhone: open the LinkedIn tab, tap QR, tap Scan, tap "Allow camera" and approve the system prompt. Then scan any LinkedIn QR code and check it opens the right person's profile. If nothing happens, check that Settings, Unfeed (or Expo Go), Camera is on.
5. The home screen method (Safari with no app, uses the free "Userscripts" extension). Check on your phone: these steps could not be tested overnight. Full details are in README under "Use the home screen method instead". Short version: install "Userscripts" from the App Store and turn it on in Safari's extensions; save userscripts/unfeed-instagram.user.js and userscripts/unfeed-linkedin.user.js from this repo into the Userscripts app; open instagram.com/direct/inbox/ and linkedin.com/messaging/ in Safari, log in once each, and add each to the home screen (turn "Open as Web App" OFF if your iOS shows that switch, so the extension runs). Then check that home bounces to your messages and the feed stays hidden.

## Known limits (not bugs)

- No push notifications from either service. That needs their APIs, and the whole point is to use none.
- Voice notes and some media may not play in the websites. Nothing to fix on our side.
- Both sites change their pages often. If hiding stops working somewhere, tell Denis to update the rules; AGENTS.md explains how for agents.
- Google and Facebook sign in buttons often refuse inside app web views. Use username and password.
