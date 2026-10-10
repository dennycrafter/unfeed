// Messages the injected script posts to the native side through
// window.ReactNativeWebView.postMessage (charter section 8.5). Shared by the
// inject code and the native hosts so both sides agree on the wire format.

export type PageMessage =
  | { type: 'route'; url: string }
  | { type: 'inject-error'; message: string };

export function isPageMessage(value: unknown): value is PageMessage {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.type === 'route') return typeof record.url === 'string';
  if (record.type === 'inject-error') return typeof record.message === 'string';
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
