// The junk list (Denis, 21 Nov 2026): tracking goes, the pages and their
// bot protection stay.

import { isJunk } from '../../src/inject/junk';

test.each([
  'https://www.instagram.com/ajax/bz',
  'https://www.instagram.com/ajax/bz?__a=1',
  'https://graph.instagram.com/logging_client_events',
  'https://www.linkedin.com/tscp-serving/dtag?x=1',
  'https://www.linkedin.com/li/track',
  'https://px.ads.linkedin.com/collect?pid=1',
])('%s is junk', (url) => {
  expect(isJunk(url)).toBe(true);
});

test.each([
  'https://www.instagram.com/api/graphql',
  'https://www.instagram.com/ajax/bootloader-endpoint/',
  'https://www.instagram.com/ajax/bzzz',
  'https://www.instagram.com/direct/inbox/',
  'https://www.facebook.com/instagram/login_sync/',
  'https://www.linkedin.com/voyager/api/messaging',
  'https://client.protechts.net/PXdOjV695v/main.min.js',
  'https://www.google.com/recaptcha/enterprise.js',
  'https://merchantpool1.linkedin.com/mdt.js',
  'not a url',
])('%s stays', (url) => {
  expect(isJunk(url)).toBe(false);
});

test('relative addresses are read against the page origin', () => {
  expect(isJunk('/ajax/bz', 'https://www.instagram.com')).toBe(true);
  expect(isJunk('/api/graphql', 'https://www.instagram.com')).toBe(false);
});
