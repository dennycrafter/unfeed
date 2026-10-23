# AGENTS.md

This is Unfeed: an Expo (React Native) app that shows Instagram and LinkedIn inside WebViews with every feed, reels and explore page blocked at the navigation level. The full charter (tickets, route tables, UI rules) is the master build document in the Obvious project; this file covers what an agent needs day to day.

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt, an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

This project is on Expo SDK 58 because that is what Expo Go on the App Store runs (moved from 57 on 23 Oct 2026). Only change the SDK when the App Store Expo Go changes; a mismatched SDK fails to open in Expo Go with a version error.

## The one rule that matters: one source of truth for blocking

Every decision about what loads and what gets hidden comes from these files:

- `src/rules/instagram.json`, `src/rules/linkedin.json`: the route tables (data only).
- `src/rules/decide.ts`: the one matcher. Native route guard, injected scripts and userscripts all answer from it.
- `src/inject/`: the in-page script (hide CSS, DOM sweeps, pushState hooks, in-page enforcement).
- `src/inject/css/`: named hide rules, stable selectors only (href, aria-label, role, text). Never the sites' hashed class names.

Generated files, never edit by hand:

- `src/inject/generated/*.generated.ts` (the app's inject bundles)
- `userscripts/*.user.js` (the Safari and Tampermonkey scripts)

Both come out of `npm run build:inject`. CI runs that build and fails on any diff, so a stale generated file cannot merge. If tests compare a generated file, regenerate first.

Any new rule or selector change must keep three layers in agreement, and the tests hold you to it:

1. unit tables (`tests/unit/instagram-table.ts`, `tests/unit/linkedin-table.ts`) through native `decide()`
2. the generated bundle in a node vm (`tests/unit/inject-parity.test.ts`) and the userscript body (`tests/unit/userscript.test.ts`)
3. real browser behavior on fixtures (`tests/inject/*.spec.ts`)

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add; resolves SDK-compatible versions
npm run build:inject        # rebuild generated inject bundles and userscripts
npm test                    # jest unit tests
npm run test:inject         # Playwright: inject + userscript fixture tests
npm run test:screens        # Playwright: web preview screenshots at 390x844 (builds inject + web export first)
npm run typecheck           # tsc --noEmit
npm run lint                # expo lint
npx expo-doctor             # dependency and config health
```

Run lint and typecheck before declaring any task done. Playwright needs its browser once per machine: `npx playwright install --with-deps chromium`.

## Test conventions

- Unit tables live in `tests/unit/*-table.ts` and are shared by every parity test. Add new route rules there first.
- Fixtures (`tests/fixtures/*.html`) use only stable attributes and fake hashed class names, to prove selectors never depend on the sites' rotating classes.
- The inject specs serve fixtures under the real hosts (`https://www.instagram.com/**`) with `page.route`, and install scripts with `addInitScript` at document start.
- The userscript specs run the committed userscript body with no bridge stub and no settings preamble, exactly what a userscript manager provides.
- Screen tests capture at 390x844 into `docs/screenshots/` and are checked against the dark UI rules (charter section 10, tokens in `src/theme/tokens.ts`).

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/`; every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Dependencies

Expo Go only includes its bundled native modules. The approved list is in the charter (react-native-webview, expo-camera, react-native-svg, async-storage, expo-haptics, expo-linking, expo-router, safe-area-context, screens, react-native-qrcode-svg, plus expo-clipboard and expo-audio, both included in Expo Go). Adding anything else breaks Expo Go. If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation); never create or edit them by hand.

## PR rules

- One branch and one PR per ticket, conventional commit prefixes, squash merge.
- `react-native-webview` has no web support: any host change must keep the `.web.tsx` placeholder building.
- Files Denis reads (README, DENIS_TODO, BLOCKERS, ASSUMPTIONS, PROGRESS, UI strings): plain words, short numbered steps, and never an em dash or en dash. Check with `grep` for the characters before merging docs.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`); no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest`; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md
