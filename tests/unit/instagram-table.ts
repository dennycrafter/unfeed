// The charter T1 URL table: every row of the Instagram rules plus the edge
// cases the ticket names. Shared by the decide() unit test and the
// native/injected parity test so both always test the same URLs.

import type { DecideResult } from '../../src/rules/decide';

export interface DecideRow {
  name: string;
  url: string;
  context?: string;
  allowSharedPosts?: boolean;
  expected: Pick<DecideResult, 'action' | 'to'>;
}

const ALLOW = { action: 'allow' as const };
const toInbox = { action: 'redirect' as const, to: '/direct/inbox/' };
const toSearch = { action: 'redirect' as const, to: '/explore/search/' };
const EXTERNAL = { action: 'external' as const };

export const INSTAGRAM_DECIDE_TABLE: DecideRow[] = [
  // Home (rules 4 and 5)
  { name: 'home root redirects to DMs', url: 'https://www.instagram.com/', expected: toInbox },
  { name: 'bare host home redirects to DMs', url: 'https://instagram.com/', expected: toInbox },
  { name: 'mobile host home redirects to DMs', url: 'https://m.instagram.com/', expected: toInbox },
  { name: 'home in stories context is allowed', url: 'https://www.instagram.com/', context: 'stories', expected: ALLOW },
  { name: 'home with a query string still redirects', url: 'https://www.instagram.com/?hl=en', expected: toInbox },
  // DMs (rule 2)
  { name: 'dm inbox allowed', url: 'https://www.instagram.com/direct/inbox/', expected: ALLOW },
  { name: 'dm thread allowed', url: 'https://www.instagram.com/direct/t/123/', expected: ALLOW },
  { name: 'dm path without a trailing slash allowed', url: 'https://www.instagram.com/direct/t/123', expected: ALLOW },
  { name: 'dm path in upper case allowed', url: 'https://www.instagram.com/Direct/t/123/', expected: ALLOW },
  { name: 'dm root allowed', url: 'https://www.instagram.com/direct/', expected: ALLOW },
  // Stories (rule 3)
  { name: 'a friend story allowed', url: 'https://www.instagram.com/stories/someuser/123/', expected: ALLOW },
  { name: 'stories root allowed', url: 'https://www.instagram.com/stories/', expected: ALLOW },
  // Reels feed (rule 8)
  { name: 'reels root redirects to DMs', url: 'https://www.instagram.com/reels/', expected: toInbox },
  { name: 'reels channel redirects to DMs', url: 'https://www.instagram.com/reels/abc/', expected: toInbox },
  { name: 'reels path in upper case redirects', url: 'https://www.instagram.com/REELS/', expected: toInbox },
  // Single shared posts (rule 9), setting on and off
  { name: 'reel allowed when shared posts on', url: 'https://www.instagram.com/reel/abc/', allowSharedPosts: true, expected: ALLOW },
  { name: 'reel redirects when shared posts off', url: 'https://www.instagram.com/reel/abc/', allowSharedPosts: false, expected: toInbox },
  { name: 'post allowed when shared posts on', url: 'https://www.instagram.com/p/abc/', allowSharedPosts: true, expected: ALLOW },
  { name: 'post redirects when shared posts off', url: 'https://www.instagram.com/p/abc/', allowSharedPosts: false, expected: toInbox },
  { name: 'igtv allowed when shared posts on', url: 'https://www.instagram.com/tv/abc/', allowSharedPosts: true, expected: ALLOW },
  { name: 'igtv redirects when shared posts off', url: 'https://www.instagram.com/tv/abc/', allowSharedPosts: false, expected: toInbox },
  { name: 'reel query string is ignored', url: 'https://www.instagram.com/reel/abc/?igsh=xyz', allowSharedPosts: true, expected: ALLOW },
  { name: 'deep post path falls through to allow', url: 'https://www.instagram.com/p/abc/xyz/', expected: ALLOW },
  // Explore (rules 6 and 7)
  { name: 'explore root redirects to search', url: 'https://www.instagram.com/explore/', expected: toSearch },
  { name: 'explore search allowed', url: 'https://www.instagram.com/explore/search/', expected: ALLOW },
  { name: 'explore search with a query allowed', url: 'https://www.instagram.com/explore/search/?hl=en', expected: ALLOW },
  { name: 'explore path in upper case redirects to search', url: 'https://www.instagram.com/Explore/', expected: toSearch },
  // Profiles (rules 10 and 11)
  { name: 'a username profile allowed', url: 'https://www.instagram.com/someuser/', expected: ALLOW },
  { name: 'username reels tab allowed', url: 'https://www.instagram.com/someuser/reels/', expected: ALLOW },
  { name: 'username tagged tab allowed', url: 'https://www.instagram.com/someuser/tagged/', expected: ALLOW },
  { name: 'unknown deep path allowed', url: 'https://www.instagram.com/developer/tools/', expected: ALLOW },
  // Login, checks and legal (rule 1)
  { name: 'login allowed', url: 'https://www.instagram.com/accounts/login/', expected: ALLOW },
  { name: 'login with a next param allowed', url: 'https://www.instagram.com/accounts/login/?next=/direct/', expected: ALLOW },
  { name: 'challenge allowed', url: 'https://www.instagram.com/challenge/abc/', expected: ALLOW },
  { name: 'consent allowed', url: 'https://www.instagram.com/consent/check/', expected: ALLOW },
  { name: 'privacy allowed', url: 'https://www.instagram.com/privacy/', expected: ALLOW },
  { name: 'legal allowed', url: 'https://www.instagram.com/legal/terms/', expected: ALLOW },
  // Other hosts (rule 12)
  { name: 'a foreign host opens outside', url: 'https://google.com/', expected: EXTERNAL },
  { name: 'a lookalike host opens outside', url: 'https://evil-instagram.com/', expected: EXTERNAL },
  { name: 'an unknown instagram subdomain opens outside', url: 'https://sub.instagram.com/', expected: EXTERNAL },
  { name: 'an instagram cdn asset allowed', url: 'https://scontent.cdninstagram.com/v/t51.0-1/photo.jpg', expected: ALLOW },
  { name: 'a facebook cdn asset allowed', url: 'https://scontent.xx.fbcdn.net/v/t39.2365-1/img.png', expected: ALLOW },
  { name: 'the fbcdn bare host allowed', url: 'https://fbcdn.net/', expected: ALLOW },
  { name: 'a facebook login page allowed', url: 'https://www.facebook.com/login/', expected: ALLOW },
  { name: 'a facebook login without a trailing slash allowed', url: 'https://facebook.com/login', expected: ALLOW },
  { name: 'a facebook page that is not login opens outside', url: 'https://www.facebook.com/feed/', expected: EXTERNAL },
  { name: 'the accounts center allowed', url: 'https://accountscenter.instagram.com/profiles/', expected: ALLOW },
  { name: 'a login path on a foreign host opens outside', url: 'https://google.com/login', expected: EXTERNAL },
  // Schemes and oddities
  { name: 'about blank passes through', url: 'about:blank', expected: ALLOW },
  { name: 'a data url passes through', url: 'data:text/html,<h1>hi</h1>', expected: ALLOW },
  { name: 'an explicit port is ignored', url: 'https://www.instagram.com:443/direct/t/9/', expected: ALLOW },
  { name: 'a double slash path is home', url: 'https://www.instagram.com//', expected: toInbox },
];
