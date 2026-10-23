// Paste a link (Denis, 23 Oct 2026): a shared Instagram or LinkedIn link
// opens inside Unfeed instead of pushing him to the Instagram app. Pure, so
// the unit tests cover every shape a shared link arrives in.

import { classifyCode } from '../qr/classifyCode';

export type PastedLink =
  | { kind: 'instagram'; url: string }
  | { kind: 'linkedin'; url: string }
  | { kind: 'none' };

const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"']+/i;
const BARE_SITE_LINK = /\b(?:www\.)?(?:instagram\.com|instagr\.am|linkedin\.com|lnkd\.in)\/[^\s<>"']*/i;

/** Finds the first link in pasted text ("check this https://..." included),
 * also when the share sheet left the https:// off. Trailing punctuation from
 * a sentence is dropped. */
export function findLink(text: string): string | null {
  const found = URL_IN_TEXT.exec(text)?.[0] ?? BARE_SITE_LINK.exec(text)?.[0];
  if (!found) return null;
  const trimmed = found.replace(/[).,!?;:]+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Which app the pasted text belongs to. Instagram links move to
 * www.instagram.com, where the signed in session lives. */
export function readPastedLink(text: string): PastedLink {
  const link = findLink(text);
  if (!link) return { kind: 'none' };
  const payload = classifyCode(link);
  if (payload.kind === 'linkedin') return { kind: 'linkedin', url: payload.url };
  if (payload.kind !== 'instagram') return { kind: 'none' };
  const parsed = new URL(payload.url);
  return { kind: 'instagram', url: `https://www.instagram.com${parsed.pathname}${parsed.search}` };
}
