// Charter T5 acceptance: decide() honours the settings context. The shared
// posts setting flips the single post / reel / feed update rules; every rule
// that does not use a setting answers the same no matter what is set. The
// full URL tables live in instagram-table.ts and linkedin-table.ts and are
// shared with decide.test.ts and the parity tests.

import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';
import { LINKEDIN_DECIDE_TABLE } from './linkedin-table';

describe('decide honours allowSharedPosts for instagram', () => {
  test('a single post opens when sharing is allowed', () => {
    expect(decide('instagram', 'https://www.instagram.com/p/Cabc123/', 'dms', { allowSharedPosts: true }).action).toBe('allow');
  });

  test('a single post redirects to the inbox when sharing is off', () => {
    expect(decide('instagram', 'https://www.instagram.com/p/Cabc123/', 'dms', { allowSharedPosts: false })).toMatchObject({
      action: 'redirect',
      to: '/direct/inbox/',
    });
  });

  test('a reel opens when sharing is allowed and redirects when off', () => {
    expect(decide('instagram', 'https://www.instagram.com/reel/Cabc123/', 'dms', { allowSharedPosts: true }).action).toBe('allow');
    expect(decide('instagram', 'https://www.instagram.com/reel/Cabc123/', 'dms', { allowSharedPosts: false }).to).toBe('/direct/inbox/');
  });

  test('an igtv post follows the same setting', () => {
    expect(decide('instagram', 'https://www.instagram.com/tv/Cabc123/', 'dms', { allowSharedPosts: true }).action).toBe('allow');
    expect(decide('instagram', 'https://www.instagram.com/tv/Cabc123/', 'dms', { allowSharedPosts: false }).action).toBe('redirect');
  });

  test('rules that do not use the setting answer the same either way', () => {
    for (const row of INSTAGRAM_DECIDE_TABLE) {
      if (row.allowSharedPosts !== undefined) continue;
      const context = row.context ?? 'dms';
      const on = decide('instagram', row.url, context, { allowSharedPosts: true });
      const off = decide('instagram', row.url, context, { allowSharedPosts: false });
      expect(off).toEqual(on);
    }
  });
});

describe('decide honours allowSharedPosts for linkedin', () => {
  test('a feed update opens when sharing is allowed', () => {
    expect(decide('linkedin', 'https://www.linkedin.com/feed/update/urn:li:activity:1/', 'messages', { allowSharedPosts: true }).action).toBe('allow');
  });

  test('a feed update redirects to messaging when sharing is off', () => {
    expect(decide('linkedin', 'https://www.linkedin.com/feed/update/urn:li:activity:1/', 'messages', { allowSharedPosts: false })).toMatchObject({
      action: 'redirect',
      to: '/messaging/',
    });
  });

  test('a post page follows the same setting', () => {
    expect(decide('linkedin', 'https://www.linkedin.com/posts/someone-123/', 'messages', { allowSharedPosts: true }).action).toBe('allow');
    expect(decide('linkedin', 'https://www.linkedin.com/posts/someone-123/', 'messages', { allowSharedPosts: false }).to).toBe('/messaging/');
  });

  test('rules that do not use the setting answer the same either way', () => {
    for (const row of LINKEDIN_DECIDE_TABLE) {
      if (row.allowSharedPosts !== undefined) continue;
      const context = row.context ?? 'messages';
      const on = decide('linkedin', row.url, context, { allowSharedPosts: true });
      const off = decide('linkedin', row.url, context, { allowSharedPosts: false });
      expect(off).toEqual(on);
    }
  });
});

// Flipping the setting must flip the decision for every table row that names
// it: the tables store each row's chosen setting, so the opposite setting
// must produce a different action (allow becomes a redirect and back).
describe('every shared posts row flips with the setting', () => {
  const cases = [
    ...INSTAGRAM_DECIDE_TABLE.map((row) => ({ site: 'instagram' as const, row })),
    ...LINKEDIN_DECIDE_TABLE.map((row) => ({ site: 'linkedin' as const, row })),
  ].filter((entry) => entry.row.allowSharedPosts !== undefined);

  test('such rows exist in both tables', () => {
    expect(cases.filter((entry) => entry.site === 'instagram').length).toBeGreaterThan(0);
    expect(cases.filter((entry) => entry.site === 'linkedin').length).toBeGreaterThan(0);
  });

  test.each(cases)('$site $row.name', ({ site, row }) => {
    const context = row.context ?? (site === 'instagram' ? 'dms' : 'messages');
    const on = decide(site, row.url, context, { allowSharedPosts: true });
    const off = decide(site, row.url, context, { allowSharedPosts: false });
    expect(on.action).not.toBe(off.action);
  });
});
