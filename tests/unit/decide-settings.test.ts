// Single posts and reels are not a feed (Denis, 25 Oct 2026): they open no
// matter what the old shared posts setting says. Every rule answers the same
// with the setting on or off. The full URL tables live in instagram-table.ts
// and linkedin-table.ts and are shared with decide.test.ts and the parity
// tests.

import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';
import { LINKEDIN_DECIDE_TABLE } from './linkedin-table';

describe('single Instagram posts and reels always open', () => {
  test.each([
    'https://www.instagram.com/p/Cabc123/',
    'https://www.instagram.com/reel/Cabc123/',
    'https://www.instagram.com/tv/Cabc123/',
  ])('%s opens with the setting on and off', (url) => {
    for (const context of ['dms', 'search', 'profile', 'stories']) {
      expect(decide('instagram', url, context, { allowSharedPosts: true }).action).toBe('allow');
      expect(decide('instagram', url, context, { allowSharedPosts: false }).action).toBe('allow');
    }
  });

  test('the feeds stay blocked', () => {
    const off = { allowSharedPosts: false };
    expect(decide('instagram', 'https://www.instagram.com/', 'dms', off)).toMatchObject({ action: 'redirect', rule: 'ig-5-home' });
    expect(decide('instagram', 'https://www.instagram.com/reels/', 'dms', off)).toMatchObject({ action: 'redirect', rule: 'ig-8-reels' });
    expect(decide('instagram', 'https://www.instagram.com/explore/', 'dms', off)).toMatchObject({ action: 'redirect', rule: 'ig-7-explore' });
  });

  test('rules answer the same either way', () => {
    for (const row of INSTAGRAM_DECIDE_TABLE) {
      const context = row.context ?? 'dms';
      const on = decide('instagram', row.url, context, { allowSharedPosts: true });
      const off = decide('instagram', row.url, context, { allowSharedPosts: false });
      expect(off).toEqual(on);
    }
  });
});

describe('single LinkedIn posts always open', () => {
  test.each([
    'https://www.linkedin.com/feed/update/urn:li:activity:1/',
    'https://www.linkedin.com/posts/someone-123/',
  ])('%s opens with the setting on and off', (url) => {
    expect(decide('linkedin', url, 'page', { allowSharedPosts: true }).action).toBe('allow');
    expect(decide('linkedin', url, 'page', { allowSharedPosts: false }).action).toBe('allow');
  });

  test('the feed stays blocked', () => {
    expect(decide('linkedin', 'https://www.linkedin.com/feed/', 'page', { allowSharedPosts: false })).toMatchObject({
      action: 'redirect',
      rule: 'li-9-feed',
    });
  });

  test('rules answer the same either way', () => {
    for (const row of LINKEDIN_DECIDE_TABLE) {
      const context = row.context ?? 'messages';
      const on = decide('linkedin', row.url, context, { allowSharedPosts: true });
      const off = decide('linkedin', row.url, context, { allowSharedPosts: false });
      expect(off).toEqual(on);
    }
  });
});
