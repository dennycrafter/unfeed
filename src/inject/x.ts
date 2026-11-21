// X injected script entry (Denis, 21 Nov 2026): the named hide rules from
// src/inject/css/x.css, X's own bars replaced by the app's, other people's
// timelines hidden on their profiles, the Discover more section under a post
// hidden, the signed in username for the Profile tab, unread watching and
// in-page rule enforcement.

import css from './css/x.css';
import { parseNamedCss, ruleCss } from './cssRules';
import { installStyle, setupInject, type HideSweep } from './common';

const rules = parseNamedCss(css);

const applyNamedRules: HideSweep = () => {
  for (const rule of rules) installStyle(`unfeed-rule-x-${rule.id}`, ruleCss(rule));
};

const HIDDEN_ATTR = 'data-unfeed-hidden';
const TIMELINE_ATTR = 'data-unfeed-timeline';
const NOTE_ID = 'unfeed-x-note';

function hide(element: Element): void {
  if (element.getAttribute(HIDDEN_ATTR) === null) element.setAttribute(HIDDEN_ATTR, '');
}

/** Paths that are never a profile, even though they are one segment. */
const NOT_A_PROFILE = new Set([
  'home',
  'explore',
  'search',
  'notifications',
  'messages',
  'compose',
  'settings',
  'i',
  'login',
  'logout',
  'account',
  'intent',
  'hashtag',
  'tos',
  'privacy',
  'jobs',
]);

const USERNAME = /^[A-Za-z0-9_]{1,15}$/;

/** A profile's lists of posts. Followers, following and similar lists of
 * people are not timelines and stay. */
const POST_LISTS = new Set(['with_replies', 'media', 'likes', 'highlights', 'articles', 'superfollows']);

/** The profile whose posts a path shows: /name, /name/with_replies,
 * /name/media and so on, but not a single post or a list of people. */
export function profileOf(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const name = parts[0];
  if (!name || !USERNAME.test(name) || NOT_A_PROFILE.has(name.toLowerCase())) return null;
  if (parts.length > 1 && !POST_LISTS.has(parts[1].toLowerCase())) return null;
  return name;
}

const OWN_KEY = 'unfeed-x-username';

function ownUsername(): string | null {
  try {
    return window.localStorage?.getItem(OWN_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The signed in username, from X's own Profile link in its nav bar (hidden
 * but still in the page). Kept for the profile check below and sent to the
 * app for its Profile tab. */
const detectUsername: HideSweep = (_settings, post) => {
  const link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  const href = link?.getAttribute('href') ?? '';
  const value = /^\/([A-Za-z0-9_]{1,15})$/.exec(href)?.[1];
  if (!value) return;
  const scope = globalThis as { __UNFEED_X__?: { posted?: string } };
  const state = (scope.__UNFEED_X__ = scope.__UNFEED_X__ ?? {});
  if (state.posted === value) return;
  state.posted = value;
  try {
    window.localStorage?.setItem(OWN_KEY, value);
  } catch {
    // Storage blocked: the Edit profile check below still finds the own profile.
  }
  post({ type: 'x-username', value });
};

function isOwnProfile(name: string): boolean {
  const own = ownUsername();
  if (own && own.toLowerCase() === name.toLowerCase()) return true;
  return document.querySelector('a[href="/settings/profile"], [data-testid="editProfileButton"]') !== null;
}

/** Someone else's profile shows who they are (name, bio, follow and message
 * buttons) but never their posts: that list is a timeline (Denis, 21 Nov
 * 2026). The own profile keeps everything. */
const hideOtherTimelines: HideSweep = () => {
  const name = profileOf(location.pathname);
  if (!name || isOwnProfile(name)) {
    document.getElementById(NOTE_ID)?.remove();
    for (const element of document.querySelectorAll(`[${TIMELINE_ATTR}]`)) {
      element.removeAttribute(TIMELINE_ATTR);
      element.removeAttribute(HIDDEN_ATTR);
    }
    return;
  }
  const primary = document.querySelector('[data-testid="primaryColumn"]') ?? document.querySelector('main') ?? document.body;
  let first: Element | null = null;
  for (const timeline of primary.querySelectorAll('[aria-label^="Timeline:"], [role="tablist"]')) {
    if (timeline.closest('[role="dialog"]')) continue;
    timeline.setAttribute(TIMELINE_ATTR, '');
    hide(timeline);
    first = first ?? timeline;
  }
  if (first && !document.getElementById(NOTE_ID)) {
    const message = document.createElement('div');
    message.id = NOTE_ID;
    message.textContent = 'Posts are hidden in Unfeed. Open a single post from your notifications or messages.';
    message.style.cssText = 'padding:24px 16px;color:#8b98a5;font:15px -apple-system,system-ui,sans-serif;text-align:center;';
    first.parentElement?.insertBefore(message, first);
  }
};

/** Under a single post: the post and its replies stay, and from the
 * Discover more heading down everything goes (it is a feed). */
const DISCOVER_HEADING = /^(discover more|more posts|you might like)\b/i;

const hideDiscoverMore: HideSweep = () => {
  if (!/^\/[^/]+\/status\/\d+/.test(location.pathname)) return;
  let hiding = false;
  for (const cell of document.querySelectorAll('[data-testid="cellInnerDiv"]')) {
    if (!hiding) {
      const heading = cell.querySelector('h2, [role="heading"]');
      const text = (heading?.textContent ?? '').trim();
      if (text && DISCOVER_HEADING.test(text)) hiding = true;
    }
    if (hiding) hide(cell);
  }
};

/** X's own bottom tab bar, replaced by the app's. A page's own header with
 * a back arrow and a title stays. */
const hideOwnBars: HideSweep = () => {
  if (!(globalThis as { ReactNativeWebView?: unknown }).ReactNativeWebView) return;
  for (const bar of document.querySelectorAll('nav[role="navigation"], [data-testid="BottomBar"]')) {
    if (bar.querySelector('a[data-testid^="AppTabBar_"]')) hide(bar.closest('[data-testid="BottomBar"]') ?? bar);
  }
};

const OPEN_APP = /^(open app|get the app|use the app|open in app|switch to the app|download the app)$/i;

/** Get the app banners, found by their button text. */
const hideAppBanners: HideSweep = () => {
  for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
    if (trigger.closest(`[${HIDDEN_ATTR}]`)) continue;
    if (!OPEN_APP.test((trigger.textContent ?? '').trim())) continue;
    let target: Element = trigger;
    let node = trigger.parentElement;
    for (let hop = 0; node && hop < 6; hop += 1) {
      if ((node.textContent ?? '').trim().length > 200 || node.matches('main, [role="main"]')) break;
      target = node;
      node = node.parentElement;
    }
    hide(target);
  }
};

setupInject('x', {
  sweeps: [applyNamedRules, detectUsername, hideOwnBars, hideOtherTimelines, hideDiscoverMore, hideAppBanners],
  unread: true,
  enforce: true,
});
