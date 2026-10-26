# Unfeed

Instagram and LinkedIn with no feed. Unfeed opens the real mobile websites of Instagram and LinkedIn inside one app, jumps straight to your messages, and blocks the feed, reels and explore pages at the navigation level. You log in once inside the app with your normal accounts, the same as using Safari. There are no private APIs, no scraping and no automation of either service, so there is nothing that puts your accounts at risk.

## What it is

One app, two services, no feeds:

- Instagram: opens straight to your DMs. Unfeed's own bar has Stories, DMs, Search, Post and Profile; Instagram's own bars and "get the app" banners are hidden. Stories shows Unfeed's own row of story circles, never the home page. Single posts and reels always open. The home feed, the Reels tab and the Explore grid are blocked.
- LinkedIn: opens straight to Messages. Unfeed's own bar has Profile, Messages, Search, Post and Notifications; LinkedIn's own bars and "get the app" banners are hidden. Single posts and Recent activity always open. The feed and post search results are blocked.
- Both apps share the same top bar: Link (paste a link), QR on LinkedIn, the switcher, and the Settings gear.
- Settings lists the last 20 pages that were blocked, with the rule that did it, under "Blocked pages".
- A switcher at the top moves between the two, and both stay logged in and keep their place.
- On LinkedIn, the QR button at the top left scans other people's codes and shows yours.
- Videos in Instagram DMs and stories play with sound. If you mute one yourself, the app leaves sound alone.

The app is an Expo (React Native) app that shows the official Instagram and LinkedIn mobile websites inside web views. Every navigation is checked against a list of rules before it loads. Rules and hiding styles live in one place in the code and are shared by the app and the browser scripts below.

## Get it on your iPhone (no PC needed)

The app is uploaded to Expo's servers (EAS Update), so Expo Go on the iPhone loads it from there. The PC can be off.

1. On the iPhone, install "Expo Go" from the App Store: https://apps.apple.com/app/expo-go/id982107779
2. Open Expo Go, tap the avatar in the top right corner, log in as denispopov.
3. On the Expo Go home screen, under Projects, tap unfeed. Tap the branch called main, then the newest update. The app opens.
4. If unfeed is not listed, open https://expo.dev/accounts/denispopov/projects/unfeed on the iPhone, open the newest update and tap Preview.
5. Log into Instagram and LinkedIn once inside the app. Use your username and password: the Google and Facebook sign in buttons often refuse to work inside app web views.
6. If Instagram or LinkedIn show a security check like "Was this you?", approve it in the app or by email. That is normal for a new login, not a bug.

The phone still needs internet, the same as the real Instagram and LinkedIn apps.

### Sending a new version to the phone

After any change to the app, run this once on the PC in the project folder: npm run publish:phone
Then close and reopen unfeed in Expo Go. It picks up the new version.

The upload is marked for Expo Go SDK 58 (app.json, ios.runtimeVersion policy "sdkVersion"). Keep it that way: Expo Go only opens updates marked with its own SDK.

## Run it from the PC instead (for development)

This is the live development mode: changes on the PC show up on the phone straight away, but the PC must stay on. You need a Windows PC, an iPhone, and about 20 minutes.

1. On the PC, install Node.js LTS from nodejs.org if you do not have it.
2. Download this repo: click the green Code button, choose Download ZIP, then unzip it, for example to C:\Users\Denis Popov\Documents\claude-workspace\unfeed.
3. Open Command Prompt in that folder: click the folder in File Explorer, type cmd in the address bar, press Enter.
4. In Command Prompt run: npm install
5. Make a free account at expo.dev if you do not have one. The Expo Go app now requires a login to run projects (new since September 2026).
6. In Command Prompt run: npx expo login --browser
   Log in with the same account in the browser window that opens. If the command stops with an error about cmd.exe, it printed a login link first: open that link yourself and log in.
7. In Command Prompt run: npx expo start --tunnel
   Leave that window open.
8. On the iPhone: install "Expo Go" from the App Store. Open Expo Go, tap the avatar in the top right corner, log in with the same account.
9. Scan the QR code shown in Command Prompt with the iPhone camera. The app loads in Expo Go.
10. Log into Instagram and LinkedIn once inside the app. Use your username and password: the Google and Facebook sign in buttons often refuse to work inside app web views.
11. If Instagram or LinkedIn show a security check like "Was this you?", approve it in the app or by email. That is normal for a new login, not a bug.

In this mode the PC must stay on with the Command Prompt window open while you use the app. For everyday use, use the no PC method above.

## Use the home screen method instead

These steps put a feed free Instagram and LinkedIn straight on the home screen through Safari. Check on your phone: these steps could not be tested overnight, because they need your iPhone and your accounts.

You need the free "Userscripts" app from the App Store.

1. On the iPhone, install "Userscripts" from the App Store.
2. Open the Settings app, tap Safari, tap Extensions, tap Userscripts and turn it on. Allow it on all websites. If iOS shows extension settings in a different place on your version, turn Userscripts on anywhere Safari lists extensions.
3. Open the Unfeed repo in Safari: github.com/dennycrafter/unfeed. Open the userscripts folder, tap unfeed-instagram.user.js, tap Raw, then save the file with the Userscripts app when it offers. Do the same for unfeed-linkedin.user.js. The Userscripts app has its own library screen where both files should now be listed and switched on.
4. In Safari, open instagram.com/direct/inbox/ and log in. Tap the share button, tap "Add to Home Screen". If your iOS shows an "Open as Web App" switch, turn it OFF, so Safari (and the userscript) runs. If your iOS does not show that switch, a bookmark in Safari works instead.
5. Do the same for linkedin.com/messaging/.
6. Tapping those icons now opens Instagram or LinkedIn with no feed: home bounces to your DMs or Messages automatically, and the feed parts are hidden.
7. Check on your phone: confirm the feed does not appear and messages load. If hiding stops working one day, the site changed its page. Update the userscript files the same way as step 3.

The phone app (Expo Go) is the main way to use Unfeed. The userscripts are the backup without Expo Go, and the desktop version: on Chrome or Firefox, install Tampermonkey and add both .user.js files the same way.

## How to update

1. On the PC, download the repo again (green Code button, Download ZIP) or run git pull if you cloned it. Unzip over the old folder.
2. In Command Prompt in that folder run: npm install
3. Run: npm run build:inject
4. Run: npm run publish:phone
5. In Expo Go on the iPhone, close unfeed and open it again. It loads the new version.
6. For the userscripts: save the new .user.js files into the Userscripts app again (step 3 above). Tampermonkey checks for a new @version by itself.

## What's not possible and why

- No push notifications. Instagram and LinkedIn only send those through their official apps or their private APIs, which Unfeed does not touch.
- Some media may not work on the websites: voice notes, some video calls and some story uploads behave differently on the mobile websites than in the apps.
- The sites can change their pages at any time. When they do, hiding or redirecting can break until the rules in this repo are updated. The QR screen and messages keep working even then.
- Posting on Instagram goes through Instagram's own create screen: the Post button opens it. Posting on LinkedIn uses the Post tab, which opens LinkedIn's own composer.

## Troubleshooting

1. The app does not load in Expo Go: check the PC Command Prompt is still running npx expo start --tunnel, and that phone and PC have internet. Restart the command if in doubt.
2. Expo Go asks for a login: that is normal since September 2026. Log in with the free Expo account (step 5 above) on the PC and in Expo Go.
3. Instagram or LinkedIn log out every time: keep the app installed the way it is, do not clear its data. If it still happens, log in again with username and password, not with Google or Facebook buttons.
4. "Was this you?" checks: approve them. A new browser login triggers them once.
5. The feed shows up in the userscript method: the userscript is not running. Check the Userscripts extension is on for the site (step 2) and the file is enabled in the Userscripts library (step 3).
6. A page looks broken or half hidden: the site changed. Report it, or run npm run build:inject after updating the rules.

## Running the tests

Every check below runs on every pull request, so a green check mark on GitHub means all of these passed.

| Command | What it does |
|---|---|
| npm test | Unit tests: the rules tables, the QR code classifier, settings, unread parsing, the shell, and the userscript headers and parity |
| npm run test:inject | Playwright tests: the injected scripts and the userscripts run against saved copies of the real pages |
| npm run test:screens | Playwright tests: every screen of the web preview at phone size 390x844, with screenshots saved to docs/screenshots |
| npm run build:inject | Rebuilds the injected scripts and the userscripts from the shared rules |
| npm run typecheck | Runs tsc --noEmit |
| npm run lint | Runs eslint |
| npm run web | Builds the web preview into dist/ |
| npx expo-doctor | Checks the Expo setup is healthy |

If you changed anything in src/rules, src/inject or the CSS, run npm run build:inject before npm test, so the tests check the files you just changed.

## How the app is put together

```
Phone (Expo Go)
 app shell (React Native, expo router)
  top bar (same on both): Link, QR (LinkedIn), the switcher, settings gear
  tab bar: Instagram (Stories, DMs, Search, Post, Profile) and LinkedIn
           (Profile, Messages, Search, Post, Notifications)
  stories screen: native story circles, read by a hidden web view on Instagram home
  Instagram host: one web view on instagram.com, never unloaded
  LinkedIn host: one web view on linkedin.com, never unloaded
  QR screen: camera scanner and your code
  each web view gets: the generated inject script + the route guard

Browser (Safari with Userscripts, or Tampermonkey)
 userscripts/unfeed-instagram.user.js and unfeed-linkedin.user.js
  the same code the app injects, with a userscript header on top
```

The parts and where they live:

- src/rules/instagram.json and linkedin.json: the route tables. Every allow, redirect and external rule for both sites, in plain data.
- src/rules/decide.ts: the one matcher that reads those tables. decide(site, url, context, settings) returns allow, redirect or external. The app's route guard, the injected scripts and the userscripts all answer with this same function.
- src/inject/: the script the app injects into each page. It applies the hide CSS, watches for page changes, hooks pushState so single page moves are caught, and checks the rules inside the page as a second line of defence.
- src/inject/css/: the hide rules as CSS with named blocks. Selectors use stable hooks only (links, labels, roles), never the sites' scrambled class names.
- scripts/build-inject.ts: bundles the rules, CSS and inject code into src/inject/generated/ (for the app) and into the two userscript files (for Safari and Tampermonkey). One build step, so the app and the browser scripts can never drift. CI fails if anyone edits the generated files by hand.
- src/userscript/header.ts: the userscript metadata block, built from the same rules JSON.
- src/hosts/: the two web view hosts and the web preview placeholder.
- src/qr/: the scanner, your code screen, and the classifier for scanned codes.
- src/state/: settings on the phone (AsyncStorage), recent searches.
- src/theme/tokens.ts: the dark UI colours and sizes.
- tests/unit/, tests/inject/, tests/screens/: the three test layers described above.

To find anything else: the screens are in src/app/, and the components the shell is made of are in src/components/.

## Expo SDK this project uses

This project uses Expo SDK 58.

Why: on October 23, 2026 Expo Go on the App Store moved to SDK 58 and refused to open the SDK 57 version ("Project is incompatible with this version of Expo Go"). Expo Go can only run one SDK version at a time, and iPhones can only install the newest Expo Go, so this project follows whatever SDK the App Store Expo Go runs.

## Commands

| Command | What it does |
|---|---|
| npm start | Starts the Expo dev server |
| npm run web | Builds the web preview into dist/ |
| npm test | Runs the unit tests (jest) |
| npm run test:inject | Runs the Playwright tests for the injected scripts and the userscripts |
| npm run test:screens | Runs the Playwright screenshot tests of the web preview |
| npm run build:inject | Bundles the route rules and hide CSS into the injected scripts and the userscripts |
| npm run typecheck | Runs tsc --noEmit |

## Tracking files

- DENIS_TODO.md: steps only Denis can do
- BLOCKERS.md: blocked items and workarounds
- ASSUMPTIONS.md: decisions taken while building
- PROGRESS.md: one line per merged PR
