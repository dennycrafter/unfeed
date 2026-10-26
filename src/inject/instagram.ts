// Instagram injected script entry (charter sections 8.4 and 8.5): the named
// hide rules from src/inject/css/instagram.css applied per page scope, plus
// unread watching, username detection, hide statistics and in-page rule
// enforcement with the tab context the native side declared in the preamble.

import css from './css/instagram.css';
import { parseNamedCss, ruleCss, ruleSelectors } from './cssRules';
import { createPoster, installStyle, setupInject, type HideSweep } from './common';
import type { InjectSettings } from './protocol';
import { pageScopes } from './scopes';

const rules = parseNamedCss(css);

/** Which scopes the current page belongs to. The counts scope is settings
 * driven rather than path driven (charter section 8.4). */
function activeScopes(settings: InjectSettings): Set<string> {
  const scopes = new Set<string>(pageScopes(location.pathname));
  if (settings.hideCounts) scopes.add('counts');
  return scopes;
}

/** How many elements a rule's selectors match right now, for the hide
 * statistics message (the S9 debug screen reads these). A selector the
 * current browser rejects must not stop the sweep. */
function countMatches(selectors: string[]): number {
  let total = 0;
  for (const selector of selectors) {
    try {
      total += document.querySelectorAll(selector).length;
    } catch {
      // Skip unparsable selectors; the rule itself stays applied.
    }
  }
  return total;
}

/** Installs every named rule whose scopes are live on this page and removes
 * the others, then reports the per-rule match counts to native. */
const applyNamedRules: HideSweep = (settings, post) => {
  const live = activeScopes(settings);
  const matched: Record<string, number> = {};
  for (const rule of rules) {
    const applies = rule.scopes.every((scope) => live.has(scope));
    const element = `unfeed-rule-ig-${rule.id}`;
    if (!applies) {
      installStyle(element, '');
      matched[rule.id] = 0;
      continue;
    }
    installStyle(element, ruleCss(rule));
    matched[rule.id] = countMatches(ruleSelectors(rule));
  }
  post({ type: 'hide-stats', matched });
};

const HIDDEN_ATTR = 'data-unfeed-hidden';

function hide(element: Element): void {
  if (element.getAttribute(HIDDEN_ATTR) === null) element.setAttribute(HIDDEN_ATTR, '');
}

/** Icon labels of Instagram's own navigation links. New post is left out on
 * purpose: the own profile header carries it next to the Options menu, and
 * that header must stay. Checked against the live site on 15 Oct 2026. */
const NAV_ICON_LABELS = new Set([
  'Home',
  'Reels',
  'Explore',
  'Search',
  'Messages',
  'Direct',
  'Notifications',
  'Activity Feed',
  'Instagram',
  'Threads',
]);

function navLabel(anchor: Element): string | null {
  for (const svg of anchor.querySelectorAll('svg[aria-label]')) {
    const label = svg.getAttribute('aria-label');
    if (label && NAV_ICON_LABELS.has(label)) return label;
  }
  return null;
}

/** Never hide anything that holds the page itself or an open dialog. */
const PAGE_CONTENT = 'main, [role="main"], [role="dialog"], textarea';

function holdsPageContent(element: Element): boolean {
  if (element === document.body || element === document.documentElement) return true;
  return element.matches(PAGE_CONTENT) || element.querySelector(PAGE_CONTENT) !== null;
}

function isPinned(element: Element): boolean {
  const position = getComputedStyle(element).position;
  return position === 'fixed' || position === 'sticky';
}

function navLinkCount(container: Element): number {
  let count = 0;
  for (const anchor of container.querySelectorAll('a[href]')) {
    if (navLabel(anchor)) count += 1;
  }
  return count;
}

/** The bar a nav link sits in: the first fixed or sticky ancestor that holds
 * no page content. Failing that, and only outside the page's main area, the
 * highest such ancestor while it is bar sized and holds two or more nav links,
 * so a profile's own Reels tab is never taken for a bar. The site's markup
 * has no nav element, so the bar is found this way. */
function navBarFor(anchor: Element): Element | null {
  let candidate: Element | null = null;
  let node = anchor.parentElement;
  for (let hop = 0; node !== null && hop < 16; hop += 1) {
    if (holdsPageContent(node)) break;
    if (isPinned(node)) return node;
    candidate = node;
    node = node.parentElement;
  }
  if (candidate === null || anchor.closest('main, [role="main"]')) return null;
  const barSized = candidate.getBoundingClientRect().height <= window.innerHeight * 0.3;
  return barSized && navLinkCount(candidate) >= 2 ? candidate : null;
}

/** Instagram's own top and bottom bars, replaced by the native bar. Found
 * from the link icons, since the class names change every week. */
const hideOwnNav: HideSweep = () => {
  for (const anchor of document.querySelectorAll('a[href]')) {
    if (anchor.closest(`[${HIDDEN_ATTR}], [role="dialog"]`)) continue;
    if (!navLabel(anchor)) continue;
    const bar = navBarFor(anchor);
    if (bar) hide(bar);
  }
};

const USERNAME = /^[A-Za-z0-9._]{1,30}$/;

/** Paths that are never a username, even though they are one segment. */
const NOT_A_USERNAME = new Set(['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'tv', 'create', 'notifications']);

function usernameFromHref(href: string): string | null {
  let path = '';
  try {
    path = new URL(href, location.origin).pathname;
  } catch {
    return null;
  }
  const match = /^\/([A-Za-z0-9._]+)\/?$/.exec(path);
  const value = match?.[1];
  if (!value || !USERNAME.test(value) || NOT_A_USERNAME.has(value.toLowerCase())) return null;
  return value;
}

/** The signed in username (Denis, 26 Oct 2026). It used to be the first
 * avatar link on any page, so a story or a DM put a friend's name in
 * Settings. Now it only comes from places that are always Denis himself:
 * the profile item in Instagram's own nav bar (a link with an avatar that
 * sits with two or more nav icons, outside the page, posts and dialogs), or
 * his own profile page, the only profile with an Edit profile link. */
function ownUsername(): string | null {
  for (const anchor of document.querySelectorAll('a[href]')) {
    if (!anchor.querySelector('img')) continue;
    if (anchor.closest('main, [role="main"], article, [role="dialog"]')) continue;
    const value = usernameFromHref(anchor.getAttribute('href') ?? '');
    if (!value) continue;
    // The bar around it: never a container that also holds the page.
    let node = anchor.parentElement;
    for (let hop = 0; node !== null && hop < 6; hop += 1) {
      if (holdsPageContent(node)) break;
      if (navLinkCount(node) >= 2) return value;
      node = node.parentElement;
    }
  }
  if (document.querySelector('a[href="/accounts/edit/"], a[href^="/accounts/edit/?"]')) {
    return usernameFromHref(location.href);
  }
  return null;
}

const detectUsername: HideSweep = (_settings, post) => {
  const scope = globalThis as { __UNFEED_IG__?: { postedUsername?: string } };
  const state = (scope.__UNFEED_IG__ = scope.__UNFEED_IG__ ?? {});
  const value = ownUsername();
  if (!value || state.postedUsername === value) return;
  state.postedUsername = value;
  post({ type: 'ig-username', value });
};

/** A post page shows the post (Denis, 26 Oct 2026). The old rule hid every
 * part of the page after the first, which on some posts was the post itself
 * and left a blank page. Now only the "More posts from" and suggestion
 * sections go: from their heading up to the largest part that holds none of
 * the post's own controls (Like, comment box). If that is unclear, nothing is
 * hidden. */
const RELATED_HEADING = /^(more posts from\b|more from\b|suggested for you$|suggested posts$|related posts$|you might like$)/i;
const POST_CONTROLS = 'svg[aria-label="Like"], svg[aria-label="Unlike"], textarea, [aria-label="Comment"], form';

function hideRelatedFrom(heading: Element): void {
  let target: Element | null = null;
  let node: Element | null = heading;
  for (let hop = 0; node !== null && hop < 10; hop += 1) {
    const parent: Element | null = node.parentElement;
    if (parent === null || parent === document.body || parent.matches('main, [role="main"]')) break;
    if (parent.querySelector(POST_CONTROLS)) break;
    node = parent;
    target = node;
  }
  if (target && !target.querySelector(POST_CONTROLS)) hide(target);
}

const hideRelatedPosts: HideSweep = () => {
  if (!pageScopes(location.pathname).includes('post-page')) return;
  for (const heading of document.querySelectorAll('h1, h2, h3, h4, span, div')) {
    if (heading.children.length > 1 || heading.closest(`[${HIDDEN_ATTR}]`)) continue;
    const text = (heading.textContent ?? '').trim();
    if (text.length > 60 || !RELATED_HEADING.test(text)) continue;
    hideRelatedFrom(heading);
  }
};

const OPEN_APP_PATTERN = /^(get the app|open app|open the app|use the app|open instagram|get instagram|download the app|switch to the app)$/i;

/** The smallest ancestor that holds only the banner, so the page survives. */
function hideTightContainer(trigger: Element): void {
  let target = trigger;
  let node = trigger.parentElement;
  for (let hop = 0; node !== null && hop < 6; hop += 1) {
    if (holdsPageContent(node) || (node.textContent ?? '').trim().length > 160) break;
    target = node;
    // A pinned banner is the whole banner: stop there.
    if (isPinned(node)) break;
    node = node.parentElement;
  }
  hide(target);
}

/** Get the app banners and bottom sheets, found by their button text. */
const hideAppBanners: HideSweep = () => {
  for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
    if (trigger.closest(`[${HIDDEN_ATTR}]`)) continue;
    if (OPEN_APP_PATTERN.test((trigger.textContent ?? '').trim())) hideTightContainer(trigger);
  }
};

const KEEP_ATTR = 'data-unfeed-keep';

/** Videos friends send (Denis, 23 Oct 2026): keep them playing inside the
 * page, so iOS never throws them into its own sideways full screen player. */
const keepVideosInline: HideSweep = () => {
  for (const video of document.querySelectorAll('video')) {
    if (video.getAttribute('playsinline') !== null) continue;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
  }
};

/** Sound for videos (Denis, 25 Oct 2026). Instagram's site starts every
 * video muted, so DM videos and stories played silent even with the audio
 * mode set (src/state/audio.ts). When a video starts it gets its sound, once:
 * through Instagram's own sound button when that shows sound off, otherwise
 * by unmuting the video itself. The moment Denis taps a sound button or mutes
 * a video himself, the app leaves sound alone until the page reloads. */
const SOUND_OFF_LABEL = /^(audio is muted|audio muted|unmute|sound off|turn sound on|play sound)$/i;
const SOUND_CONTROL_LABEL =
  /^(audio is muted|audio muted|audio is playing|toggle audio|unmute|mute|sound off|sound on|turn sound on|turn sound off|play sound)$/i;

interface SoundState {
  /** Denis chose for himself: never touch sound again on this page. */
  userChose: boolean;
  /** Volume changes before this time are the app's own, not Denis's. */
  ourChangeUntil: number;
  given: WeakSet<HTMLVideoElement>;
}

function ariaLabel(element: Element): string {
  return (element.getAttribute('aria-label') ?? '').trim();
}

function press(element: Element): void {
  if (element instanceof HTMLElement) element.click();
  else element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Instagram's own sound button for this video, when it says sound is off.
 * Only looked for in containers that hold this one video, so a button that
 * belongs to another video in the thread is never pressed. */
function soundOffButton(video: HTMLVideoElement): Element | null {
  let node: Element | null = video.parentElement;
  for (let hop = 0; node !== null && hop < 8; hop += 1) {
    if (node.querySelectorAll('video').length > 1) return null;
    for (const candidate of node.querySelectorAll('[aria-label]')) {
      if (SOUND_OFF_LABEL.test(ariaLabel(candidate))) return candidate.closest('button, [role="button"]') ?? candidate;
    }
    node = node.parentElement;
  }
  return null;
}

function unmute(video: HTMLVideoElement, state: SoundState): void {
  state.ourChangeUntil = Date.now() + 800;
  video.muted = false;
  video.volume = 1;
}

function giveSound(video: HTMLVideoElement, state: SoundState): void {
  state.given.add(video);
  const button = soundOffButton(video);
  if (!button) {
    unmute(video, state);
    return;
  }
  state.ourChangeUntil = Date.now() + 800;
  press(button);
  // The site's button normally unmutes the video; if it did not, do it here.
  window.setTimeout(() => {
    if (!state.userChose && video.muted) unmute(video, state);
  }, 300);
}

function installVideoSound(): void {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  const state: SoundState = { userChose: false, ourChangeUntil: 0, given: new WeakSet() };
  document.addEventListener(
    'play',
    (event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement)) return;
      if (state.userChose || state.given.has(video)) return;
      giveSound(video, state);
    },
    true,
  );
  document.addEventListener(
    'volumechange',
    (event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement) || Date.now() < state.ourChangeUntil) return;
      if (state.given.has(video) && (video.muted || video.volume === 0)) state.userChose = true;
    },
    true,
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const control = event.target.closest('[aria-label]');
      if (control && SOUND_CONTROL_LABEL.test(ariaLabel(control))) state.userChose = true;
    },
    true,
  );
}

/** Instagram's own create controls, newest labels first. */
const CREATE_LABEL = /^(new post|create|new|post)$/i;

function findCreateControl(): HTMLElement | null {
  for (const svg of document.querySelectorAll('svg[aria-label]')) {
    if (!CREATE_LABEL.test(svg.getAttribute('aria-label') ?? '')) continue;
    const control = svg.closest('a, button, [role="link"], [role="button"]');
    if (control instanceof HTMLElement) return control;
  }
  const link = document.querySelector('a[href^="/create/"]');
  if (link instanceof HTMLElement) return link;
  const input = document.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
  return input instanceof HTMLElement ? input : null;
}

const SHEET_ID = 'unfeed-post-sheet';

/** iOS only opens the photo picker from a real tap inside the page, and a
 * tap on the native Post button is not one. So Post shows this small sheet,
 * and its button press (a real tap) presses Instagram's own control. */
function showPostSheet(control: HTMLElement): void {
  document.getElementById(SHEET_ID)?.remove();
  const sheet = document.createElement('div');
  sheet.id = SHEET_ID;
  sheet.setAttribute(KEEP_ATTR, '');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'New post');
  sheet.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#1c1c20;' +
    'border:1px solid #2a2a30;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,.3);padding:16px;' +
    'font:15px -apple-system,Inter,system-ui,sans-serif;color:#f2f2f4;';
  const title = document.createElement('div');
  title.textContent = 'New post';
  title.style.cssText = 'font-weight:600;margin-bottom:4px;';
  const hint = document.createElement('div');
  hint.textContent = 'Pick a photo or video to share on Instagram.';
  hint.style.cssText = 'color:#9a9aa3;margin-bottom:14px;';
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.textContent = 'Choose photo or video';
  choose.style.cssText =
    'display:block;width:100%;padding:12px;border:0;border-radius:6px;background:#2ee6a6;color:#0b0b0d;' +
    'font:600 15px -apple-system,Inter,system-ui,sans-serif;';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.style.cssText =
    'display:block;width:100%;margin-top:8px;padding:10px;border:0;background:none;color:#9a9aa3;' +
    'font:15px -apple-system,Inter,system-ui,sans-serif;';
  choose.addEventListener('click', () => {
    sheet.remove();
    control.click();
  });
  cancel.addEventListener('click', () => sheet.remove());
  sheet.append(title, hint, choose, cancel);
  document.body.appendChild(sheet);
}

/** The native Post button calls this. Reports back when the page has no
 * create control (a DM thread, say), so native can try the profile page. */
function installCreateHook(): void {
  const scope = globalThis as { __UNFEED_CREATE__?: () => void };
  const post = createPoster('instagram');
  scope.__UNFEED_CREATE__ = () => {
    const control = findCreateControl();
    if (control) showPostSheet(control);
    else post({ type: 'ig-create-missing' });
  };
}

installCreateHook();
installVideoSound();

setupInject('instagram', {
  sweeps: [applyNamedRules, detectUsername, hideOwnNav, hideAppBanners, hideRelatedPosts, keepVideosInline],
  unread: true,
  enforce: true,
});
