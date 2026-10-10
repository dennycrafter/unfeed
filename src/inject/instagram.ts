// Instagram injected script entry (charter sections 8.4 and 8.5): the named
// hide rules from src/inject/css/instagram.css applied per page scope, plus
// unread watching, username detection, hide statistics and in-page rule
// enforcement with the tab context the native side declared in the preamble.

import css from './css/instagram.css';
import { parseNamedCss, ruleCss, ruleSelectors } from './cssRules';
import { installStyle, setupInject, type HideSweep } from './common';
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

setupInject('instagram', {
  sweeps: [applyNamedRules, detectUsername],
  unread: true,
  enforce: true,
});
