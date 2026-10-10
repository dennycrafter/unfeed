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
12. The injected scripts enforce the route rules inside the page with a neutral tab context, because a page cannot know which native tab is showing. The LinkedIn table has no context dependent rows, so the answer is identical there (the Instagram table's context row is enforced by T2's own entry).
13. Redirects that keep the query string rebuild it with URLSearchParams, so a space inside keywords comes out as +, the standard form encoding.
14. The shared path normalizer collapses duplicate slashes, so a URL like https://www.linkedin.com// counts as home and redirects to Messages exactly like / does.
15. The unread watcher skips an empty document title: at document start the real title is not parsed yet, and an empty title is not a real zero unread state. The first real title posts the count.
16. LinkedIn's global top bar hides through :has() on its feed and network link hrefs, so the whole header goes wherever those links nest inside it.
17. A profile link is only saved as Denis's own when it comes from the /in/me/ redirect started by the Profile tab or the My code "Find my profile" button. Browsing or scanning someone else's profile never overwrites the saved link, so My code keeps showing the right person.
18. A scanned LinkedIn link that contains a vanity path opens on the Profile tab, and every other LinkedIn link opens on the Messages tab. The QR panel covers the page, so a scanned page loaded under the QR tab would be invisible to Denis.
19. The ?scan= and ?profile= router params fill the scan sheet and My code at mount. Deep links and web page loads always start the screen fresh, so the params only need to be read once and no effect is used.

