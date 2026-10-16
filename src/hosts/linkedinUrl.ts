// Pure URL helpers for the LinkedIn host (charter section 8.6).

const LINKEDIN_HOST_SUFFIX = 'linkedin.com';

/** True when the URL points at linkedin.com or a subdomain of it. */
export function isLinkedInUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === LINKEDIN_HOST_SUFFIX || host.endsWith(`.${LINKEDIN_HOST_SUFFIX}`);
  } catch {
    return false;
  }
}

/** The vanity slug from a profile URL like https://www.linkedin.com/in/ada/.
 * Returns null for other paths, for /in/me/ and for foreign hosts, so the
 * app never saves the placeholder as a real profile link. */
export function extractVanityFromUrl(rawUrl: string): string | null {
  if (!isLinkedInUrl(rawUrl)) return null;
  try {
    const path = new URL(rawUrl).pathname.toLowerCase();
    const match = /^\/in\/([^/]+)\/?$/.exec(path);
    const vanity = match?.[1];
    if (!vanity || vanity === 'me') return null;
    return vanity;
  } catch {
    return null;
  }
}

/** A typed in profile link as a full URL, so the QR code opens in any
 * scanner: "linkedin.com/in/ada" becomes "https://linkedin.com/in/ada".
 * Returns null for blank text. */
export function normalizeProfileUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`;
}

/** The people search URL for keywords (charter section 8.6). */
export function buildPeopleSearchUrl(keywords: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}
