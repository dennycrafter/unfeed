// The X URL table (Denis, 21 Nov 2026): posting, replies, messages,
// notifications, search, single posts, profiles with their posts and
// bookmarks work; the home timeline, explore, lists, communities and trends
// never show. Shared by the decide() unit test and the parity tests.

import type { DecideRow } from './linkedin-table';

const ALLOW = { action: 'allow' as const };
const toMessages = { action: 'redirect' as const, to: '/messages/' };
const EXTERNAL = { action: 'external' as const };

export const X_DECIDE_TABLE: DecideRow[] = [
  // Home (rules x-5)
  { name: 'the root redirects', url: 'https://x.com/', expected: toMessages },
  { name: 'the home timeline redirects', url: 'https://x.com/home', expected: toMessages },
  { name: 'the home timeline with a query redirects', url: 'https://x.com/home?lang=en', expected: toMessages },
  { name: 'twitter.com home redirects too', url: 'https://twitter.com/home', expected: toMessages },
  { name: 'mobile.x.com home redirects too', url: 'https://mobile.x.com/', expected: toMessages },
  // Feeds (rule x-6)
  { name: 'explore redirects', url: 'https://x.com/explore', expected: toMessages },
  { name: 'explore tabs redirect', url: 'https://x.com/explore/tabs/for-you', expected: toMessages },
  { name: 'search with nothing typed redirects (it is explore)', url: 'https://x.com/search', expected: toMessages },
  { name: 'a list timeline redirects', url: 'https://x.com/i/lists/123', expected: toMessages },
  { name: 'communities redirect', url: 'https://x.com/i/communities/123', expected: toMessages },
  { name: 'trends redirect', url: 'https://x.com/i/trends', expected: toMessages },
  // Kept (rules x-1 to x-4 and the fallback)
  { name: 'the login flow allowed', url: 'https://x.com/i/flow/login', expected: ALLOW },
  { name: 'the onboarding login page allowed', url: 'https://x.com/i/jf/onboarding/web', expected: ALLOW },
  { name: 'logout allowed', url: 'https://x.com/logout', expected: ALLOW },
  { name: 'settings allowed', url: 'https://x.com/settings/profile', expected: ALLOW },
  { name: 'the composer allowed', url: 'https://x.com/compose/post', expected: ALLOW },
  { name: 'a reply composer allowed', url: 'https://x.com/compose/post?in_reply_to=123', expected: ALLOW },
  { name: 'a post intent allowed', url: 'https://x.com/intent/post?text=hi', expected: ALLOW },
  { name: 'messages allowed', url: 'https://x.com/messages', expected: ALLOW },
  { name: 'a message thread allowed', url: 'https://x.com/messages/123-456', expected: ALLOW },
  { name: 'chat allowed', url: 'https://x.com/i/chat/123', expected: ALLOW },
  { name: 'notifications allowed', url: 'https://x.com/notifications', expected: ALLOW },
  { name: 'mentions allowed', url: 'https://x.com/notifications/mentions', expected: ALLOW },
  { name: 'a single post allowed', url: 'https://x.com/someone/status/1234567890', expected: ALLOW },
  { name: 'a post photo allowed', url: 'https://x.com/someone/status/1234567890/photo/1', expected: ALLOW },
  { name: 'a profile allowed', url: 'https://x.com/someone', expected: ALLOW },
  { name: 'search results allowed', url: 'https://x.com/search?q=news&src=typed_query', expected: ALLOW },
  { name: 'latest search results allowed', url: 'https://x.com/search?q=news&f=live', expected: ALLOW },
  { name: 'a hashtag allowed (it is a search)', url: 'https://x.com/hashtag/news', expected: ALLOW },
  { name: 'bookmarks allowed (your own saved posts)', url: 'https://x.com/i/bookmarks', expected: ALLOW },
  { name: 'a profile with its replies allowed', url: 'https://x.com/someone/with_replies', expected: ALLOW },
  { name: 'Grok is not a feed and stays', url: 'https://x.com/i/grok', expected: ALLOW },
  { name: 'images load', url: 'https://pbs.twimg.com/media/abc.jpg', expected: ALLOW },
  { name: 'another site opens outside', url: 'https://example.com/', expected: EXTERNAL },
];
