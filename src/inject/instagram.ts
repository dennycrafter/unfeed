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

/** Instagram's own nav carries a link to the signed in profile with the
 * avatar inside it (charter section 8.5). Read it once and post the
 * username; Settings only needs it when detection fails. */
const detectUsername: HideSweep = (_settings, post) => {
  const scope = globalThis as { __UNFEED_IG__?: { postedUsername?: string } };
  const state = (scope.__UNFEED_IG__ = scope.__UNFEED_IG__ ?? {});
  if (state.postedUsername) return;
  for (const anchor of document.querySelectorAll('a[href]')) {
    if (!(anchor instanceof HTMLAnchorElement)) continue;
    let path = '';
    try {
      path = new URL(anchor.getAttribute('href') ?? '', location.origin).pathname;
    } catch {
      continue;
    }
    if (!/^\/[A-Za-z0-9._]+\/?$/.test(path)) continue;
    if (path.startsWith('/explore') || path.startsWith('/reels')) continue;
    if (!anchor.querySelector('img')) continue;
    const value = path.replace(/\//g, '');
    state.postedUsername = value;
    post({ type: 'ig-username', value });
    return;
  }
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

/** Story controls on the home page: buttons labelled "Story by name", the
 * own "Your story" item and links into /stories/. Never inside a feed post. */
const STORY_CONTROL = '[aria-label^="Story by" i], [aria-label$="\'s story" i], [aria-label="Your story" i], a[href^="/stories/"]';

function storyControls(): Element[] {
  return [...document.querySelectorAll(STORY_CONTROL)].filter((element) => !element.closest('article'));
}

function commonAncestor(elements: Element[]): Element | null {
  let candidate: Element | null = elements[0] ?? null;
  while (candidate && !elements.every((element) => candidate!.contains(element))) {
    candidate = candidate.parentElement;
  }
  return candidate;
}

const NOTE_ID = 'unfeed-stories-note';
const NOTE_AFTER_MS = 8000;

/** Shown when the tray never turns up, so a blank page explains itself. */
function showStoriesNote(): void {
  if (document.getElementById(NOTE_ID) || !document.body) return;
  const note = document.createElement('div');
  note.id = NOTE_ID;
  note.setAttribute(KEEP_ATTR, '');
  note.textContent = 'No stories to show right now.';
  note.style.cssText =
    'position:fixed;left:16px;right:16px;top:40%;text-align:center;color:#9a9aa3;' +
    'font:15px -apple-system,Inter,system-ui,sans-serif;z-index:2147483647;';
  document.body.appendChild(note);
}

/** The stories button (Denis, 23 Oct 2026): the home page is invisible and
 * only the stories tray is kept, found from the story controls themselves.
 * The tray is the smallest element holding every control; if that would be
 * the page, each control is kept on its own instead. */
const keepStoriesTray: HideSweep = () => {
  if (!pageScopes(location.pathname).includes('home')) return;
  const scope = globalThis as { __UNFEED_IG__?: { homeSince?: number } };
  const state = (scope.__UNFEED_IG__ = scope.__UNFEED_IG__ ?? {});
  state.homeSince = state.homeSince ?? Date.now();
  const controls = storyControls();
  if (controls.length === 0) {
    if (Date.now() - state.homeSince > NOTE_AFTER_MS) showStoriesNote();
    return;
  }
  document.getElementById(NOTE_ID)?.remove();
  const tray = controls.length > 1 ? commonAncestor(controls) : (controls[0].parentElement ?? controls[0]);
  const tooBig = !tray || tray.matches('main, [role="main"], body, html') || tray.querySelector('article') !== null;
  const keep = tooBig ? controls : [tray];
  for (const element of keep) {
    if (element.getAttribute(KEEP_ATTR) === null) element.setAttribute(KEEP_ATTR, '');
  }
};

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

setupInject('instagram', {
  sweeps: [applyNamedRules, detectUsername, hideOwnNav, hideAppBanners, keepStoriesTray, keepVideosInline],
  unread: true,
  enforce: true,
});
