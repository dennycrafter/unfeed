// Instagram profile URL builder (charter stretch S1): the My code QR encodes
// https://www.instagram.com/<username>/. Usernames arrive from page detection
// or the settings row, so the value is sanitized first: whitespace trimmed,
// a leading @ removed, wrapping slashes removed, and only the characters
// Instagram itself allows kept (letters, digits, dots, underscores, 1 to 30).
// Anything else returns null, which the My code screen shows as its empty
// state instead of a broken code.

const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

export function buildInstagramProfileUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  const cleaned = username
    .trim()
    .replace(/^@/, '')
    .replace(/^\/+|\/+$/g, '');
  if (!USERNAME_PATTERN.test(cleaned)) return null;
  return `https://www.instagram.com/${cleaned}/`;
}
