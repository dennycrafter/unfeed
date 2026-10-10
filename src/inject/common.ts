// Shared runtime for the injected scripts. scripts/build-inject.ts bundles
// this into a plain JS string that runs inside the WebView (and later inside
// a browser via the T6 userscripts) before content loads. Browser-safe only:
// no react-native imports and no node APIs.

import { decide, type Site } from '../rules/decide';
import type { PageMessage } from './protocol';

export const INJECT_VERSION = 't1.1';

type PostMessage = (message: PageMessage) => void;

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

function createPoster(site: Site): PostMessage {
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

/** Hooks the single page navigation surfaces of both sites (gotcha 2): full
 * page loads are rare, so pushState, replaceState and popstate are where
 * routes actually change. The initial route is posted on setup. */
function installRouteHooks(win: MiniWindow, postRoute: (url: string) => void): void {
  const history = win.history ?? {};
  const wrap = (name: 'pushState' | 'replaceState') => {
    const original = history[name];
    if (typeof original !== 'function') return;
    history[name] = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      postRoute(currentHref(win));
      return result;
    };
  };
  wrap('pushState');
  wrap('replaceState');
  if (typeof win.addEventListener === 'function') {
    win.addEventListener('popstate', () => postRoute(currentHref(win)));
  }
  postRoute(currentHref(win));
}

export function setupInject(site: Site): void {
  const post = createPoster(site);
  try {
    const scope = globalThis as { __UNFEED__?: Record<string, unknown>; window?: MiniWindow };
    // Exposed for the parity test and later debug screens; the bundled decide
    // is the very same source the native side runs.
    scope.__UNFEED__ = { site, version: INJECT_VERSION, decide };
    const win = scope.window;
    // No window (the parity test sandbox): expose the matcher only.
    if (!win) return;
    installRouteHooks(win, (url) => {
      if (url) post({ type: 'route', url });
    });
  } catch (error) {
    post({ type: 'inject-error', message: error instanceof Error ? error.message : String(error) });
  }
}
