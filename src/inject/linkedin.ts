// LinkedIn injected script entry (charter sections 8.4 and 8.5): hide CSS,
// structural sweeps for text-only targets, unread watching and in-page rule
// enforcement, all driven by the shared rules table and matcher.

import linkedinCss from './css/linkedin.css';
import { setupInject, type HideSweep } from './common';

const HIDDEN_ATTR = 'data-unfeed-hidden';

function isHidden(element: Element): boolean {
  return element.getAttribute(HIDDEN_ATTR) !== null;
}

function hide(element: Element): void {
  element.setAttribute(HIDDEN_ATTR, '');
}

function hideAllMatching(root: ParentNode, selector: string): void {
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    if (!isHidden(node)) hide(node);
  }
}

function isOnSearchPage(): boolean {
  return location.pathname.toLowerCase().startsWith('/search/results');
}

function isOnProfilePage(): boolean {
  return location.pathname.toLowerCase().startsWith('/in/');
}

/** Search pages: hide the posts filter chip and any section titled Posts,
 * the way into content search (rule li-5). Single post cards elsewhere stay:
 * only the feed loses its cards (Denis, 25 Oct 2026). */
const hideSearchPosts: HideSweep = () => {
  if (!isOnSearchPage()) return;
  for (const chip of document.querySelectorAll('button, a')) {
    if (isHidden(chip)) continue;
    if ((chip.textContent ?? '').trim().toLowerCase() === 'posts') hide(chip);
  }
  for (const heading of document.querySelectorAll('h1, h2, h3')) {
    if ((heading.textContent ?? '').trim().toLowerCase() === 'posts') {
      hide(heading.closest('section') ?? heading.closest('div') ?? heading);
    }
  }
};

/** Profiles: hide the people suggestions. Their headings are stable text;
 * the section around each heading goes. The Activity section and the
 * recent activity pages stay (Denis, 25 Oct 2026): they are one person's
 * posts, not the feed. */
const PROFILE_HEADING_TEXTS = ['more profiles for you', 'people you may know'];

const hideProfileSuggestions: HideSweep = () => {
  if (!isOnProfilePage()) return;
  for (const heading of document.querySelectorAll('h1, h2, h3')) {
    if (isHidden(heading)) continue;
    const text = (heading.textContent ?? '').trim().toLowerCase();
    if (!PROFILE_HEADING_TEXTS.includes(text)) continue;
    hide(heading.closest('section') ?? heading.closest('div') ?? heading);
  }
};

/** Hides the smallest ancestor container that carries only the target, so a
 * banner or upsell disappears without taking the page with it. */
function hideTightContainer(trigger: Element): void {
  let node: Element | null = trigger;
  for (let hop = 0; node !== null && hop < 5; hop += 1) {
    const parent: Element | null = node.parentElement;
    node = parent;
    if (node === null) break;
    if ((node.textContent ?? '').trim().length <= 160) {
      hide(node);
      return;
    }
  }
  hide(trigger);
}

/** Get the app prompts (Denis, 23 Oct 2026): the small bottom banner and
 * the bigger pop-up asking him to leave the browser version. Matched by
 * their wording and by links into the app stores or the app itself. */
const OPEN_APP_PATTERN =
  /\b(open|use|get|try|download|install|switch to|continue in|view in|see (this|it) in)\b.{0,24}\bapp\b|\bbetter (on|in) the app\b|\blinkedin app\b/i;

const APP_LINK =
  'a[href*="apps.apple.com"], a[href*="itunes.apple.com"], a[href*="play.google.com"], a[href^="linkedin:"], ' +
  'a[href^="voyager:"], a[href^="intent:"], a[href*=".app.link"], a[href*="onelink.me"]';

const DIALOG = '[role="dialog"], [role="alertdialog"], dialog, [aria-modal="true"]';

/** Buttons that close an app prompt and keep Denis on the web version. */
const DISMISS_PATTERN =
  /^(not now|dismiss|close|no thanks|maybe later|cancel|stay on (the )?(mobile )?(web|site|browser|website)|continue (on|in|with) (the )?(mobile )?(browser|web|website))\b/i;

function isAppPromptText(text: string): boolean {
  return text.length <= 80 && OPEN_APP_PATTERN.test(text);
}

/** A pop-up is an app prompt when it is short and talks about the app. */
function isAppPromptDialog(dialog: Element): boolean {
  const text = (dialog.textContent ?? '').trim();
  return text.length <= 600 && (OPEN_APP_PATTERN.test(text) || dialog.querySelector(APP_LINK) !== null);
}

function dismissButton(dialog: Element): HTMLElement | null {
  for (const button of dialog.querySelectorAll('button, [role="button"], a')) {
    const label = `${button.getAttribute('aria-label') ?? ''} ${(button.textContent ?? '').trim()}`.trim();
    if (DISMISS_PATTERN.test(label) || /^(dismiss|close)\b/i.test(button.getAttribute('aria-label') ?? '')) {
      if (button instanceof HTMLElement) return button;
    }
  }
  return null;
}

/** Closes an app pop-up with its own Not now button when it has one, else
 * hides it with the dark backdrop around it and gives scrolling back. */
function closeAppDialog(dialog: Element): void {
  if (dialog.getAttribute('data-unfeed-dismissed') !== null) {
    // Already pressed once and still here: hide it instead.
    hideDialogWithBackdrop(dialog);
    return;
  }
  dialog.setAttribute('data-unfeed-dismissed', '');
  const button = dismissButton(dialog);
  if (button) button.click();
  else hideDialogWithBackdrop(dialog);
}

function hideDialogWithBackdrop(dialog: Element): void {
  let target = dialog;
  let node = dialog.parentElement;
  const text = (dialog.textContent ?? '').trim();
  // The backdrop wraps the dialog and holds nothing else worth reading.
  while (node && node !== document.body && (node.textContent ?? '').trim() === text) {
    target = node;
    node = node.parentElement;
  }
  hide(target);
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

/** Banners and upsells: get the app prompts and Try Premium links. */
const hideBannersAndUpsells: HideSweep = () => {
  for (const banner of document.querySelectorAll('[role="banner"]')) {
    if (isHidden(banner) || banner.matches('header')) continue;
    if (OPEN_APP_PATTERN.test(banner.textContent ?? '')) hide(banner);
  }
  for (const dialog of document.querySelectorAll(DIALOG)) {
    if (isHidden(dialog) || dialog.closest(`[${HIDDEN_ATTR}]`)) continue;
    if (isAppPromptDialog(dialog)) closeAppDialog(dialog);
  }
  for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
    if (isHidden(trigger) || trigger.closest(`[${HIDDEN_ATTR}]`) || trigger.closest(DIALOG)) continue;
    const text = (trigger.textContent ?? '').trim();
    if (isAppPromptText(text) || trigger.matches(APP_LINK)) {
      hideTightContainer(trigger);
      continue;
    }
    const href = trigger.getAttribute('href') ?? '';
    if (href.startsWith('/premium/')) hideTightContainer(trigger);
  }
};

/** Counts (charter section 8.4, hideCounts setting): only leaf elements
 * whose whole text is a count, so the profile headline survives. */
const COUNT_PATTERN = /^\d[\d,]*(\.\d+)?\+?\s*(followers|connections)$/i;

const hideCountTexts: HideSweep = (settings) => {
  if (!settings.hideCounts) return;
  for (const element of document.querySelectorAll('span, div, p')) {
    if (isHidden(element) || element.children.length > 0) continue;
    if (COUNT_PATTERN.test((element.textContent ?? '').trim())) hide(element);
  }
};

/** The bottom bar's Home item, in case it is a button rather than a /feed/
 * link: a short control whose whole text is Home. */
function inSiteBar(element: Element): boolean {
  let node: Element | null = element;
  for (let hop = 0; node !== null && hop < 8; hop += 1) {
    if (['NAV', 'HEADER', 'FOOTER'].includes(node.tagName) || node.getAttribute('role') === 'navigation') return true;
    const position = getComputedStyle(node).position;
    if (position === 'fixed' || position === 'sticky') return true;
    node = node.parentElement;
  }
  return false;
}

const hideHomeItem: HideSweep = () => {
  for (const item of document.querySelectorAll('a, button, [role="link"], [role="button"], [role="tab"]')) {
    if (isHidden(item)) continue;
    if ((item.textContent ?? '').trim().toLowerCase() !== 'home') continue;
    // A company page has its own Home tab in the page body; only bars count.
    if (inSiteBar(item)) hide(item);
  }
};

/** Only the feed itself loses its post cards: the composer can open over
 * /feed/ (shareActive), and every update card there carries a stable
 * activity or share urn. A single post (/feed/update/...) is not the feed,
 * so its card stays (Denis, 25 Oct 2026). */
function isFeedPage(pathname: string): boolean {
  return pathname.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/?$/, '/') === '/feed/';
}

const hideFeedBehindComposer: HideSweep = () => {
  if (!isFeedPage(location.pathname)) return;
  hideAllMatching(
    document,
    '[data-urn^="urn:li:activity"], [data-urn^="urn:li:share"], [data-urn^="urn:li:ugcPost"], [data-id^="urn:li:activity"]',
  );
};

/** Post composer session (Denis, 23 Oct 2026): LinkedIn opens the
 * composer at /feed/?shareActive=true and then drops shareActive from the
 * address, which the feed rule used to bounce straight to Messages. While
 * the composer is open the bare /feed/ is allowed (rule
 * li-8-composer-session); once its text box has been gone for a moment, or
 * never showed up, the session ends and the page goes back to Messages. */
interface ComposerSession {
  open: boolean;
  since: number;
  sawEditor: boolean;
  lastEditorAt: number;
  previousContext: unknown;
}

const COMPOSER_EDITOR = '[contenteditable="true"], textarea, [role="textbox"]';
const COMPOSER_GONE_MS = 1500;
const COMPOSER_NEVER_SHOWED_MS = 12000;

function composerSession(): ComposerSession {
  const scope = globalThis as { __UNFEED_LI_COMPOSER__?: ComposerSession };
  return (scope.__UNFEED_LI_COMPOSER__ = scope.__UNFEED_LI_COMPOSER__ ?? {
    open: false,
    since: 0,
    sawEditor: false,
    lastEditorAt: 0,
    previousContext: undefined,
  });
}

function setPageContext(value: unknown): void {
  (globalThis as { __UNFEED_CONTEXT__?: unknown }).__UNFEED_CONTEXT__ = value;
}

const trackComposer: HideSweep = (_settings, post) => {
  const state = composerSession();
  const path = location.pathname.toLowerCase().replace(/\/?$/, '/');
  const onFeed = path === '/feed/';
  if (onFeed && new URLSearchParams(location.search).has('shareActive') && !state.open) {
    state.open = true;
    state.since = Date.now();
    state.sawEditor = false;
    state.previousContext = (globalThis as { __UNFEED_CONTEXT__?: unknown }).__UNFEED_CONTEXT__;
    setPageContext('composer');
    post({ type: 'li-composer', open: true });
  }
  if (!state.open) return;
  const close = (backToMessages: boolean): void => {
    state.open = false;
    setPageContext(state.previousContext);
    post({ type: 'li-composer', open: false });
    if (backToMessages) window.location.replace(new URL('/messaging/', location.origin).href);
  };
  if (!onFeed) {
    // Moved on (a posted update, a profile): that page has its own rule.
    close(false);
    return;
  }
  const now = Date.now();
  if (document.querySelector(COMPOSER_EDITOR)) {
    state.sawEditor = true;
    state.lastEditorAt = now;
    return;
  }
  const waited = now - (state.sawEditor ? state.lastEditorAt : state.since);
  if (waited > (state.sawEditor ? COMPOSER_GONE_MS : COMPOSER_NEVER_SHOWED_MS)) close(true);
};

/** LinkedIn shows the own profile at /in/me/ without moving to the vanity
 * URL (checked 15 Oct 2026), so the QR code cannot wait for a route. Only
 * the own profile carries edit links, and they hold the vanity. */
const OWN_PROFILE_EDIT = /\/in\/([^/?#]+)\/edit\//;

const detectOwnProfile: HideSweep = (_settings, post) => {
  if (!isOnProfilePage()) return;
  const scope = globalThis as { __UNFEED_LI__?: { postedProfile?: string } };
  const state = (scope.__UNFEED_LI__ = scope.__UNFEED_LI__ ?? {});
  for (const anchor of document.querySelectorAll('a[href*="/in/"][href*="/edit/"]')) {
    const match = OWN_PROFILE_EDIT.exec(anchor.getAttribute('href') ?? '');
    const vanity = match?.[1]?.toLowerCase();
    if (!vanity || vanity === 'me') continue;
    const url = `https://www.linkedin.com/in/${vanity}/`;
    if (state.postedProfile === url) return;
    state.postedProfile = url;
    post({ type: 'li-own-profile', url });
    return;
  }
};

setupInject('linkedin', {
  css: linkedinCss,
  sweeps: [
    hideSearchPosts,
    hideProfileSuggestions,
    hideBannersAndUpsells,
    hideCountTexts,
    hideHomeItem,
    hideFeedBehindComposer,
    trackComposer,
    detectOwnProfile,
  ],
  unread: true,
  enforce: true,
});
