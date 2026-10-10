# ASSUMPTIONS

One line per decision made where the master document did not decide for us.

1. Expo SDK 57 chosen. Checked October 10, 2026: the Apple App Store lists Expo Go version 57.0.9 (September 2, 2026) and the Expo changelog states that the updated App Store Expo Go supports SDK 57. SDK 58 exists only as a beta. So SDK 57 is the newest SDK the App Store Expo Go can run, and the master document's SDK 54 fallback was not needed.
2. Expo Go on iOS now requires a login to run projects (Expo changelog, September 3, 2026). README and DENIS_TODO tell Denis to use one free Expo account, logged in on the PC with npx expo login and inside Expo Go.
3. The test scripts run green before the real suites exist: `test` uses jest --passWithNoTests and the Playwright scripts use --pass-with-no-tests. T1 and T2 add the real tests and keep the flags.
4. scripts/build-inject.ts is a working stub at T0 so CI can run build:inject. It writes a placeholder generated module. T1 replaces it with the real bundler.
5. The scaffold commit goes straight to local main, matching the master document T0 and gotcha 12, because a PR needs a main to merge into. The PR flow starts with the next ticket once the repo is connected.
6. The Expo template ships demo screens and components under src/app and src/components. They are kept so T0 proves the build; later tickets replace them with the real Unfeed shell.
7. app.json small touches: display name "Unfeed", dark user interface style, and dark splash and Android icon backgrounds (#0b0b0d) to match the dark UI rules in section 10. Real icon and splash art is stretch S11.
8. The task brief pointed at "charter section 5" for the route rules table, but section 5 is environment variables; the Instagram route table lives in section 8.3. The charter wins, so section 8.3 is the source of truth for decide() and the tests.
9. react-native-webview 13 does not re-export its types from the package root, so type only imports come from react-native-webview/lib/WebViewTypes (ShouldStartLoadRequest, WebViewNavigation, WebViewMessageEvent, WebViewProgressEvent).
10. The parity test runs the generated bundle in a node vm sandbox given URL and console, which are the standard globals the script finds in any real page. A bare sandbox has no URL and every parse would fail there for the wrong reason.
11. CI gained a step that runs build:inject then checks git diff on src/inject/generated, so a stale committed bundle fails CI and the app and the later userscripts cannot drift.

