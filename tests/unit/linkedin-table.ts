// The charter T3 URL table: every row of the LinkedIn rules plus the edge
// cases the ticket names (feed, jobs, posts, search, profile, mynetwork,
// messaging, notifications). Shared by the decide() unit test and the
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
const toMessaging = { action: 'redirect' as const, to: '/messaging/' };
const EXTERNAL = { action: 'external' as const };

export const LINKEDIN_DECIDE_TABLE: DecideRow[] = [
  // Home (rule li-9-home): both openers land in Messages.
  { name: 'home root redirects to Messages', url: 'https://www.linkedin.com/', expected: toMessaging },
  { name: 'bare host home redirects to Messages', url: 'https://linkedin.com/', expected: toMessaging },
  { name: 'home with a query string still redirects', url: 'https://www.linkedin.com/?trk=x', expected: toMessaging },
  // Messaging (rule li-2)
  { name: 'messaging root allowed', url: 'https://www.linkedin.com/messaging/', expected: ALLOW },
  { name: 'a message thread allowed', url: 'https://www.linkedin.com/messaging/thread/2-abc/', expected: ALLOW },
  { name: 'messaging without a trailing slash allowed', url: 'https://www.linkedin.com/messaging', expected: ALLOW },
  { name: 'messaging with a query allowed', url: 'https://www.linkedin.com/messaging/?filter=unread', expected: ALLOW },
  { name: 'messaging in upper case allowed', url: 'https://www.linkedin.com/Messaging/', expected: ALLOW },
  { name: 'messaging with a hash allowed', url: 'https://www.linkedin.com/messaging/#utm=x', expected: ALLOW },
  // Profiles and entities (rule li-3)
  { name: 'a profile allowed', url: 'https://www.linkedin.com/in/someone/', expected: ALLOW },
  { name: 'the me profile allowed', url: 'https://www.linkedin.com/in/me/', expected: ALLOW },
  { name: 'a profile sub page allowed', url: 'https://www.linkedin.com/in/someone/details/', expected: ALLOW },
  { name: 'a company page allowed', url: 'https://www.linkedin.com/company/someco/', expected: ALLOW },
  { name: 'a company sub page allowed', url: 'https://www.linkedin.com/company/someco/about/', expected: ALLOW },
  { name: 'a school page allowed', url: 'https://www.linkedin.com/school/someschool/', expected: ALLOW },
  // Search (rules li-4 and li-5)
  { name: 'a people search allowed', url: 'https://www.linkedin.com/search/results/people/', expected: ALLOW },
  { name: 'a people search with keywords allowed', url: 'https://www.linkedin.com/search/results/people/?keywords=ada', expected: ALLOW },
  { name: 'a companies search allowed', url: 'https://www.linkedin.com/search/results/companies/', expected: ALLOW },
  { name: 'an all results search allowed', url: 'https://www.linkedin.com/search/results/all/', expected: ALLOW },
  {
    name: 'a content search redirects keeping the keywords',
    url: 'https://www.linkedin.com/search/results/content/?keywords=ada%20lovelace',
    expected: { action: 'redirect' as const, to: '/search/results/people/?keywords=ada+lovelace' },
  },
  {
    name: 'a content search without keywords redirects clean',
    url: 'https://www.linkedin.com/search/results/content/',
    expected: { action: 'redirect' as const, to: '/search/results/people/' },
  },
  {
    name: 'a content search drops keys it does not keep',
    url: 'https://www.linkedin.com/search/results/content/?keywords=ada&sortBy=dd',
    expected: { action: 'redirect' as const, to: '/search/results/people/?keywords=ada' },
  },
  // My Network (rules li-6 and li-7): the whole section is allowed since
  // Denis kept LinkedIn's own bar (15 Oct 2026).
  { name: 'my network root allowed', url: 'https://www.linkedin.com/mynetwork/', expected: ALLOW },
  { name: 'my network grow page allowed', url: 'https://www.linkedin.com/mynetwork/grow/', expected: ALLOW },
  {
    name: 'the invitation manager allowed',
    url: 'https://www.linkedin.com/mynetwork/invitation-manager/',
    expected: ALLOW,
  },
  {
    name: 'a deeper invitation manager path allowed',
    url: 'https://www.linkedin.com/mynetwork/invitation-manager/sent/',
    expected: ALLOW,
  },
  // Single posts (rule li-8-single-post): always allowed, a single post is
  // not a feed (Denis, 25 Oct 2026).
  { name: 'a single feed update allowed', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/', expected: ALLOW },
  {
    name: 'a single feed update allowed with shared posts off',
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/',
    allowSharedPosts: false,
    expected: ALLOW,
  },
  { name: 'a single share update allowed', url: 'https://www.linkedin.com/feed/update/urn:li:share:7/?commentUrn=x', expected: ALLOW },
  { name: 'a single post page allowed', url: 'https://www.linkedin.com/posts/someone-123/', expected: ALLOW },
  {
    name: 'a single post page allowed with shared posts off',
    url: 'https://www.linkedin.com/posts/someone-123/',
    allowSharedPosts: false,
    expected: ALLOW,
  },
  // Recent activity on a profile (Denis, 25 Oct 2026)
  { name: 'recent activity allowed', url: 'https://www.linkedin.com/in/someone/recent-activity/', expected: ALLOW },
  { name: 'recent activity posts allowed', url: 'https://www.linkedin.com/in/someone/recent-activity/all/', expected: ALLOW },
  { name: 'recent activity comments allowed', url: 'https://www.linkedin.com/in/someone/recent-activity/comments/', expected: ALLOW },
  // The feed (rule li-9-feed)
  { name: 'the feed root redirects to Messages', url: 'https://www.linkedin.com/feed/', expected: toMessaging },
  { name: 'the feed without a trailing slash redirects', url: 'https://www.linkedin.com/feed', expected: toMessaging },
  { name: 'the feed in upper case redirects', url: 'https://www.linkedin.com/FEED/', expected: toMessaging },
  { name: 'the feed with an unrelated query redirects', url: 'https://www.linkedin.com/feed/?nis=true', expected: toMessaging },
  // The post composer on the feed path (rule li-8-composer)
  { name: 'the post composer allowed', url: 'https://www.linkedin.com/feed/?shareActive=true', expected: ALLOW },
  { name: 'the post composer allowed with other keys', url: 'https://www.linkedin.com/feed/?shareActive=true&text=hi', expected: ALLOW },
  // Composer session (rule li-8-composer-session, Denis 23 Oct 2026): the
  // site drops shareActive from the address while the composer is open, so
  // the bare feed stays allowed for that session only.
  { name: 'the bare feed allowed while the composer is open', url: 'https://www.linkedin.com/feed/', context: 'composer', expected: ALLOW },
  { name: 'the bare feed still redirects outside the composer', url: 'https://www.linkedin.com/feed/', context: 'page', expected: toMessaging },
  { name: 'a feed sub page redirects even while the composer is open', url: 'https://www.linkedin.com/feed/following/', context: 'composer', expected: toMessaging },
  { name: 'a post new page allowed', url: 'https://www.linkedin.com/post/new/', expected: ALLOW },
  // Notifications (allowed since 15 Oct 2026)
  { name: 'notifications allowed', url: 'https://www.linkedin.com/notifications/', expected: ALLOW },
  // Distractions (rule li-10)
  { name: 'news redirect to Messages', url: 'https://www.linkedin.com/news/story/abc/', expected: toMessaging },
  { name: 'video redirect to Messages', url: 'https://www.linkedin.com/video/event/abc/', expected: toMessaging },
  { name: 'learning redirect to Messages', url: 'https://www.linkedin.com/learning/courses/abc/', expected: toMessaging },
  { name: 'games redirect to Messages', url: 'https://www.linkedin.com/games/abc/', expected: toMessaging },
  // Events: root only (rule li-10-events-root), detail pages fall through
  { name: 'the events root redirects to Messages', url: 'https://www.linkedin.com/events/', expected: toMessaging },
  { name: 'an event detail page is allowed', url: 'https://www.linkedin.com/events/abc123/', expected: ALLOW },
  // Jobs (rule li-11)
  { name: 'a job view allowed', url: 'https://www.linkedin.com/jobs/view/1/', expected: ALLOW },
  { name: 'the jobs root allowed', url: 'https://www.linkedin.com/jobs/', expected: ALLOW },
  // Login, checks and settings (rule li-1)
  { name: 'login allowed', url: 'https://www.linkedin.com/login', expected: ALLOW },
  { name: 'login with a next param allowed', url: 'https://www.linkedin.com/login?fromSignIn=true', expected: ALLOW },
  { name: 'a checkpoint allowed', url: 'https://www.linkedin.com/checkpoint/challenge/abc/', expected: ALLOW },
  { name: 'a uas path allowed', url: 'https://www.linkedin.com/uas/login', expected: ALLOW },
  { name: 'an authwall allowed', url: 'https://www.linkedin.com/authwall/abc/', expected: ALLOW },
  { name: 'signup allowed', url: 'https://www.linkedin.com/signup/', expected: ALLOW },
  { name: 'psettings allowed', url: 'https://www.linkedin.com/psettings/account', expected: ALLOW },
  { name: 'mypreferences allowed', url: 'https://www.linkedin.com/mypreferences/g/notifications/', expected: ALLOW },
  // Other hosts (allowedHostSuffixes, alwaysAllowHosts, external)
  { name: 'a short link allowed inside the WebView', url: 'https://lnkd.in/abc/', expected: ALLOW },
  { name: 'a deep short link allowed', url: 'https://lnkd.in/e/xyz123', expected: ALLOW },
  { name: 'a lookalike short link host opens outside', url: 'https://evil-lnkd.in/', expected: EXTERNAL },
  { name: 'a cdn asset allowed', url: 'https://dms.licdn.com/dms/image/x.jpg', expected: ALLOW },
  { name: 'the licdn bare host allowed', url: 'https://licdn.com/', expected: ALLOW },
  { name: 'a foreign host opens outside', url: 'https://google.com/', expected: EXTERNAL },
  { name: 'a lookalike linkedin host opens outside', url: 'https://evil-linkedin.com/', expected: EXTERNAL },
  { name: 'an unknown linkedin subdomain opens outside', url: 'https://sub.linkedin.com/', expected: EXTERNAL },
  // Schemes and oddities
  { name: 'about blank passes through', url: 'about:blank', expected: ALLOW },
  { name: 'a data url passes through', url: 'data:text/html,<h1>hi</h1>', expected: ALLOW },
  { name: 'http is allowed like https', url: 'http://www.linkedin.com/messaging/', expected: ALLOW },
  { name: 'an explicit port is ignored', url: 'https://www.linkedin.com:443/messaging/', expected: ALLOW },
  { name: 'an upper case host is ignored', url: 'https://WWW.LINKEDIN.COM/messaging/', expected: ALLOW },
  { name: 'an unparseable url opens outside', url: 'not a url', expected: EXTERNAL },
  { name: 'a double slash path is home', url: 'https://www.linkedin.com//', expected: toMessaging },
];
