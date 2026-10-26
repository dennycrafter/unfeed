// The bounce log behind Settings > Blocked pages (Denis, 25 Oct 2026): last
// 20 bounces, newest first, one entry per bounce even when both guards saw
// it, saved on the phone.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BOUNCE_LOG_KEY,
  BOUNCE_LOG_LIMIT,
  formatBounceTime,
  getBounces,
  hydrateBounces,
  recordBounce,
  resetBouncesForTest,
  shortBounceUrl,
} from '../../src/state/bounceLog';
import { parsePageMessage } from '../../src/inject/protocol';

const base = new Date(2026, 9, 25, 14, 3, 7).getTime();

beforeEach(async () => {
  resetBouncesForTest();
  await AsyncStorage.clear();
});

test('a bounce keeps the time, the address and the rule, newest first', () => {
  recordBounce({ at: base, site: 'instagram', url: 'https://www.instagram.com/', rule: 'ig-5-home', to: '/direct/inbox/' });
  recordBounce({ at: base + 60000, site: 'linkedin', url: 'https://www.linkedin.com/feed/', rule: 'li-9-feed', to: '/messaging/' });
  expect(getBounces().map((entry) => entry.rule)).toEqual(['li-9-feed', 'ig-5-home']);
  expect(getBounces()[1]).toEqual({
    at: base,
    site: 'instagram',
    url: 'https://www.instagram.com/',
    rule: 'ig-5-home',
    to: '/direct/inbox/',
  });
});

test('only the last 20 are kept', () => {
  for (let i = 0; i < 30; i += 1) {
    recordBounce({ at: base + i * 10000, site: 'instagram', url: `https://www.instagram.com/reels/${i}/`, rule: 'ig-8-reels' });
  }
  expect(getBounces()).toHaveLength(BOUNCE_LOG_LIMIT);
  expect(getBounces()[0].url).toBe('https://www.instagram.com/reels/29/');
  expect(getBounces().at(-1)?.url).toBe('https://www.instagram.com/reels/10/');
});

test('the same bounce seen by both guards is kept once, a later repeat is new', () => {
  const entry = { site: 'instagram' as const, url: 'https://www.instagram.com/explore/', rule: 'ig-7-explore' };
  recordBounce({ ...entry, at: base });
  recordBounce({ ...entry, at: base + 500 });
  expect(getBounces()).toHaveLength(1);
  recordBounce({ ...entry, at: base + 10000 });
  expect(getBounces()).toHaveLength(2);
});

test('the log is saved on the phone and read back at the next launch', async () => {
  recordBounce({ at: base, site: 'linkedin', url: 'https://www.linkedin.com/feed/', rule: 'li-9-feed', to: '/messaging/' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(JSON.parse((await AsyncStorage.getItem(BOUNCE_LOG_KEY)) ?? '[]')).toHaveLength(1);
  resetBouncesForTest();
  await hydrateBounces();
  expect(getBounces()[0]).toMatchObject({ rule: 'li-9-feed', url: 'https://www.linkedin.com/feed/' });
});

test('a damaged saved log is ignored entry by entry', async () => {
  await AsyncStorage.setItem(
    BOUNCE_LOG_KEY,
    JSON.stringify([{ at: base, site: 'instagram', url: 'https://www.instagram.com/', rule: 'ig-5-home' }, { nope: true }, 7]),
  );
  await hydrateBounces();
  expect(getBounces()).toHaveLength(1);
  await AsyncStorage.setItem(BOUNCE_LOG_KEY, 'not json');
  resetBouncesForTest();
  await hydrateBounces();
  expect(getBounces()).toEqual([]);
});

test('times and addresses read short on a phone', () => {
  expect(formatBounceTime(base)).toBe('25 Oct 14:03:07');
  expect(shortBounceUrl('https://www.instagram.com/your_activity/')).toBe('instagram.com/your_activity/');
});

test('the page can report a bounce of its own', () => {
  expect(parsePageMessage(JSON.stringify({ type: 'bounce', url: 'https://www.linkedin.com/feed/', rule: 'li-composer-closed', to: '/messaging/' }))).toEqual({
    type: 'bounce',
    url: 'https://www.linkedin.com/feed/',
    rule: 'li-composer-closed',
    to: '/messaging/',
  });
  expect(parsePageMessage(JSON.stringify({ type: 'bounce', url: 'https://www.linkedin.com/feed/' }))).toBeNull();
});
