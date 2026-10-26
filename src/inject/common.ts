// Shared runtime for the injected scripts. scripts/build-inject.ts bundles
// this into a plain JS string that runs inside the WebView (and later inside
// a browser via the T6 userscripts) before content loads. Browser-safe only:
// no react-native imports and no node APIs.

import { decide, type Site } from '../rules/decide';
import { DEFAULT_INJECT_SETTINGS, type InjectSettings, type PageMessage } from './protocol';
import { parseUnreadFromTitle } from './unread';

export const INJECT_VERSION = 't3.1';

type PostMessage = (message: PageMessage) => void;

/** A site specific hide pass. Runs on setup, on every route change and on
 * every DOM mutation, always against the current inject settings. The poster
 * lets a sweep report findings (hide statistics, a detected username). */
export type HideSweep = (settings: InjectSettings, post: PostMessage) => void;

/** Site specific parts the entry file switches on (charter sections 8.4
 * and 8.5). Everything is optional so the T1 entries keep working. */
export interface InjectConfig {
  /** Hide CSS applied on every pass, regardless of settings. */
  css?: string;
  /** Structural hides that CSS cannot express (stable text and attributes). */
  sweeps?: HideSweep[];
  /** Watch document.title and post the unread count to native. */
  unread?: boolean;
  /** Enforce the route rules inside the page as a second line of defence. */
  enforce?: boolean;
}

/** Minimal structural view of the page window, so this file never depends on
 * DOM lib types being present. */
interface MiniWindow {
  history?: {
    pushState?: (...args: unknown[]) => void;
    replaceState?: (...args: unknown[]) => void;
  };
  addEventListener?: (type: string, listener: () => void) => void;
  location?: { href?: string };
}

export function createPoster(site: Site): PostMessage {
  return (message) => {
    try {
      const bridge = (globalThis as { ReactNativeWebView?: { postMessage?: (data: string) => void } })
        .ReactNativeWebView;
      if (bridge && typeof bridge.postMessage === 'function') {
        bridge.postMessage(JSON.stringify(message));
      }
    } catch (error) {
      // Nowhere to report from inside the page; keep the page alive.
      console.warn('[unfeed] postMessage failed', site, error);
    }
  };
}

function currentHref(win: MiniWindow): string {
  try {
    return typeof win.location?.href === 'string' ? win.location.href : '';
  } catch {
    return '';
  }
}

/** Reads the settings the native side declared before this script (see
 * settingsPreamble.ts). Unknown or partial values fall back to defaults. */
export function readInjectSettings(): InjectSettings {
  const raw = (globalThis as { __UNFEED_SETTINGS__?: unknown }).__UNFEED_SETTINGS__;
  const merged: InjectSettings = { ...DEFAULT_INJECT_SETTINGS };
  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>;
    if (typeof record.allowSharedPosts === 'boolean') merged.allowSharedPosts = record.allowSharedPosts;
    if (typeof record.hideCounts === 'boolean') merged.hideCounts = record.hideCounts;
  }
  return merged;
}

/** Installs or refreshes one named style block; safe to call on every pass. */
export function installStyle(id: string, css: string): void {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLStyleElement) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.documentElement.appendChild(style);
}

/** Batches hide passes to one per animation frame, so DOM mutations cannot
 * storm the page (charter section 8.4). */
function rafThrottle(fn: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    const run = () => {
      queued = false;
      try {
        fn();
      } catch (error) {
        console.warn('[unfeed] hide pass failed', error);
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 16);
  };
}

function createApplyPass(site: Site, settings: InjectSettings, config: InjectConfig, post: PostMessage): () => void {
  return () => {
    try {
      // Document start scripts can run before the html element exists; the
      // first real pass happens once it does (see whenDocumentReady).
      if (!document.documentElement) return;
      if (config.css) installStyle(`unfeed-css-${site}`, config.css);
      // Each sweep is isolated: one broken selector must not stop the rest.
      for (const sweep of config.sweeps ?? []) {
        try {
          sweep(settings, post);
        } catch (error) {
          console.warn('[unfeed] sweep failed', site, error);
        }
      }
    } catch (error) {
      console.warn('[unfeed] apply pass failed', site, error);
    }
  };
}

/** The in-page second line of defence (charter section 4): the same decide()
 * the native side runs, resolving redirects against the current origin. The
 * page reads the tab context the native side declared in the preamble, so
 * context dependent rows (Instagram's home rule) behave as native intends. */
function enforceRoute(site: Site, settings: InjectSettings, href: string, post: PostMessage): void {
  try {
    // The native side declares the tab that caused this load through the
    // preamble (Instagram's home rule is context dependent); pages without
    // it keep the neutral context.
    const declared = (globalThis as { __UNFEED_CONTEXT__?: unknown }).__UNFEED_CONTEXT__;
    const context = typeof declared === 'string' && declared ? declared : 'page';
    const result = decide(site, href, context, settings);
    if (result.action !== 'redirect' || !result.to) return;
    const target = new URL(result.to, location.origin).href;
    if (target === location.href) return;
    post({ type: 'bounce', url: href, rule: result.rule ?? 'unknown', to: result.to });
    window.location.replace(target);
  } catch (error) {
    console.warn('[unfeed] in-page enforce failed', site, error);
  }
}

/** Hooks the single page navigation surfaces of both sites (gotcha 2): full
 * page loads are rare, so pushState, replaceState and popstate are where
 * routes actually change. The initial route is delivered on setup. */
function installRouteHooks(win: MiniWindow, onRoute: (url: string) => void): void {
  const history = win.history ?? {};
  const wrap = (name: 'pushState' | 'replaceState') => {
    const original = history[name];
    if (typeof original !== 'function') return;
    history[name] = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      onRoute(currentHref(win));
      return result;
    };
  };
  wrap('pushState');
  wrap('replaceState');
  if (typeof win.addEventListener === 'function') {
    win.addEventListener('popstate', () => onRoute(currentHref(win)));
  }
  onRoute(currentHref(win));
}

/** Re-applies hides whenever the DOM changes; a site that rerenders its feed
 * must not get its hiding undone. The observer is throttled above. */
function watchDom(apply: () => void): void {
  const throttled = rafThrottle(apply);
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(throttled);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  }
  // Belt and braces for mutations that bypass the observer.
  window.setInterval(throttled, 2000);
}

/** Both sites put the unread count in brackets at the start of the title
 * (charter section 8.5). Titles change without navigation, so this polls.
 * An empty title is the document start state, not a real count, so it is
 * skipped rather than reported as zero. */
function watchUnread(post: PostMessage): void {
  let last: number | null = null;
  const check = () => {
    const title = document.title ?? '';
    if (!title.trim()) return;
    const count = parseUnreadFromTitle(title);
    if (count !== last) {
      last = count;
      post({ type: 'unread', count });
    }
  };
  check();
  window.setInterval(check, 1500);
}

/** Document start scripts can run before the html element exists (an empty
 * document has no documentElement yet), so hold DOM work until it does. */
function whenDocumentReady(run: () => void): void {
  if (document.documentElement) {
    run();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    run();
  });
  observer.observe(document, { childList: true });
}

export function setupInject(site: Site, config: InjectConfig = {}): void {
  const post = createPoster(site);
  try {
    const scope = globalThis as { __UNFEED__?: Record<string, unknown>; window?: MiniWindow };
    // Exposed for the parity test and later debug screens; the bundled decide
    // is the very same source the native side runs.
    scope.__UNFEED__ = { site, version: INJECT_VERSION, decide };
    const win = scope.window;
    // No window or DOM (the parity test sandbox): expose the matcher only.
    if (!win || typeof document === 'undefined') return;

    const settings = readInjectSettings();
    const apply = createApplyPass(site, settings, config, post);
    // Hides and DOM watching need the html element; routes do not.
    whenDocumentReady(() => {
      apply();
      watchDom(apply);
    });

    const onRoute = (url: string) => {
      if (!url) return;
      post({ type: 'route', url });
      if (config.enforce) enforceRoute(site, settings, url, post);
      apply();
    };
    installRouteHooks(win, onRoute);
    if (config.unread) watchUnread(post);
  } catch (error) {
    post({ type: 'inject-error', message: error instanceof Error ? error.message : String(error) });
  }
}
