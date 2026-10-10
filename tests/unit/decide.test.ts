// Charter T1 and T3 acceptance: at least 40 Instagram and 40 LinkedIn URLs
// through decide() with expected results, all passing. The tables are shared
// with the parity tests so both always test the same URLs.

import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';
import { LINKEDIN_DECIDE_TABLE } from './linkedin-table';

describe('decide instagram rules', () => {
  test.each(INSTAGRAM_DECIDE_TABLE)('$name', (row) => {
    const result = decide('instagram', row.url, row.context ?? 'dms', {
      allowSharedPosts: row.allowSharedPosts ?? true,
    });
    expect({ action: result.action, to: result.to }).toEqual(row.expected);
  });
});

describe('decide linkedin rules', () => {
  test.each(LINKEDIN_DECIDE_TABLE)('$name', (row) => {
    const result = decide('linkedin', row.url, row.context ?? 'messages', {
      allowSharedPosts: row.allowSharedPosts ?? true,
    });
    expect({ action: result.action, to: result.to }).toEqual(row.expected);
  });
});
