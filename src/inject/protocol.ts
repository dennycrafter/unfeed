// Messages the injected script posts to the native side through
// window.ReactNativeWebView.postMessage (charter section 8.5). Shared by the
// inject code and the native hosts so both sides agree on the wire format.

export type PageMessage =
  | { type: 'route'; url: string }
  | { type: 'unread'; count: number }
  | { type: 'inject-error'; message: string }
  | { type: 'ig-username'; value: string }
  | { type: 'ig-create-missing' }
  | { type: 'li-own-profile'; url: string }
  | { type: 'li-composer'; open: boolean }
  /** The page sent itself somewhere else (in-page guard, composer closed),
   * for the Blocked pages list in Settings. */
  | { type: 'bounce'; url: string; rule: string; to?: string }
  | { type: 'hide-stats'; matched: Record<string, number> };

export function isPageMessage(value: unknown): value is PageMessage {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.type === 'route') return typeof record.url === 'string';
  if (record.type === 'unread') return typeof record.count === 'number' && Number.isFinite(record.count);
  if (record.type === 'inject-error') return typeof record.message === 'string';
  if (record.type === 'ig-username') return typeof record.value === 'string' && record.value.length > 0;
  if (record.type === 'ig-create-missing') return true;
  if (record.type === 'li-own-profile') return typeof record.url === 'string' && record.url.length > 0;
  if (record.type === 'li-composer') return typeof record.open === 'boolean';
  if (record.type === 'bounce') {
    return (
      typeof record.url === 'string' &&
      typeof record.rule === 'string' &&
      record.rule.length > 0 &&
      (record.to === undefined || typeof record.to === 'string')
    );
  }
  if (record.type === 'hide-stats') {
    return (
      typeof record.matched === 'object' &&
      record.matched !== null &&
      Object.values(record.matched).every((count) => typeof count === 'number')
    );
  }
  return false;
}

/** Returns null for anything that is not a Unfeed message; other scripts and
 * pages post too, so unparsable data is normal here, not an error. */
export function parsePageMessage(raw: string): PageMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isPageMessage(value) ? value : null;
  } catch {
    return null;
  }
}

/** Settings the native side declares to the page before the injected script
 * runs (charter sections 8.4 and 8.5). allowSharedPosts also drives the
 * in-page route guard, hideCounts the count hiding. */
export interface InjectSettings {
  allowSharedPosts: boolean;
  hideCounts: boolean;
}

export const DEFAULT_INJECT_SETTINGS: InjectSettings = {
  allowSharedPosts: true,
  hideCounts: false,
};
