// X injected script entry (Denis, 21 Nov 2026): the named hide rules from
// src/inject/css/x.css, X's own bars replaced by the app's, the Discover
// more section under a post hidden, the signed in username for the Profile
// tab, unread watching and in-page rule enforcement. Profiles, search and
// bookmarks work as normal; only the feeds and Explore are gone.

import css from './css/x.css';
import { parseNamedCss, ruleCss } from './cssRules';
import { installStyle, setupInject, type HideSweep } from './common';

const rules = parseNamedCss(css);

const applyNamedRules: HideSweep = () => {
  for (const rule of rules) installStyle(`unfeed-rule-x-${rule.id}`, ruleCss(rule));
};

const HIDDEN_ATTR = 'data-unfeed-hidden';

function hide(element: Element): void {
  if (element.getAttribute(HIDDEN_ATTR) === null) element.setAttribute(HIDDEN_ATTR, '');
}

/** The signed in username, from X's own Profile link in its nav bar (hidden
 * but still in the page), for the app's Profile tab. */
const detectUsername: HideSweep = (_settings, post) => {
  const link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  const href = link?.getAttribute('href') ?? '';
  const value = /^\/([A-Za-z0-9_]{1,15})$/.exec(href)?.[1];
  if (!value) return;
  const scope = globalThis as { __UNFEED_X__?: { posted?: string } };
  const state = (scope.__UNFEED_X__ = scope.__UNFEED_X__ ?? {});
  if (state.posted === value) return;
  state.posted = value;
  post({ type: 'x-username', value });
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
  sweeps: [applyNamedRules, detectUsername, hideOwnBars, hideDiscoverMore, hideAppBanners],
  unread: true,
  enforce: true,
});
