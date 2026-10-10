// Unread parsing (charter section 8.5). Both sites put the unread message
// count in brackets at the start of the document title, for example
// "(3) Instagram" or "(12) Messaging | LinkedIn". A title without the
// bracket prefix means zero unread.

export function parseUnreadFromTitle(title: string): number {
  const match = /^\s*\((\d{1,3})\)(?:\s|$)/.exec(title);
  if (!match) return 0;
  const count = Number.parseInt(match[1], 10);
  return Number.isFinite(count) ? count : 0;
}
