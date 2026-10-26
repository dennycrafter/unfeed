// Redirects that go back instead of jumping to Messages (Denis, 26 Oct 2026).
// When a story ends Instagram heads home, and tapping a logo or a Reels link
// does the same. Sending every one of those to the inbox made the Profile tab
// land on DMs. For these rules the page returns to the last allowed page it
// showed, or to its own tab's start page, and only then to the rule's target.
// Pure and browser safe: the native host and the injected script share it.

export const RETURN_RULES: ReadonlySet<string> = new Set(['ig-5-home', 'ig-8-reels', 'li-9-feed', 'li-9-home']);

/** Pages that are never worth returning to: a story ends by leaving it. */
export function isReturnablePage(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return !path.startsWith('/stories/') && path !== '/' && path !== '/feed/' && !path.startsWith('/accounts/login');
  } catch {
    return false;
  }
}

/** Where a redirect should land. Rules outside RETURN_RULES keep their own
 * target. A return never points at the blocked address itself. */
export function returnTarget(
  rule: string | undefined,
  ruleTarget: string,
  lastGood: string | null,
  homeUrl: string | null,
  blockedUrl: string,
): string {
  if (!rule || !RETURN_RULES.has(rule)) return ruleTarget;
  if (lastGood && lastGood !== blockedUrl) return lastGood;
  if (homeUrl && homeUrl !== blockedUrl) return homeUrl;
  return ruleTarget;
}
