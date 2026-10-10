// Pure classifier for scanned QR payloads (charter section 8.7). A scanned
// LinkedIn code opens the LinkedIn host, an Instagram code switches apps, any
// other http(s) link opens in the browser, and everything else is plain text.
// Only the scheme check keeps unsafe schemes (javascript:, data:) out of the
// "Open in browser" path; the route guards still vet the target afterwards.

import { extractVanityFromUrl, isLinkedInUrl } from '../hosts/linkedinUrl';

export type ScanPayload =
  | { kind: 'linkedin'; url: string; vanity: string | null }
  | { kind: 'instagram'; url: string }
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string };

const LINKEDIN_SHORT_HOST = 'lnkd.in';
const INSTAGRAM_HOST_SUFFIXES = ['instagram.com', 'instagr.am'];

function hasHostSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function classifyCode(raw: string): ScanPayload {
  const value = raw.trim();
  if (!value) return { kind: 'text', text: '' };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { kind: 'text', text: value };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { kind: 'text', text: value };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    isLinkedInUrl(parsed.href) ||
    hasHostSuffix(host, LINKEDIN_SHORT_HOST)
  ) {
    return { kind: 'linkedin', url: parsed.href, vanity: extractVanityFromUrl(parsed.href) };
  }
  if (INSTAGRAM_HOST_SUFFIXES.some((suffix) => hasHostSuffix(host, suffix))) {
    return { kind: 'instagram', url: parsed.href };
  }
  return { kind: 'url', url: parsed.href };
}
