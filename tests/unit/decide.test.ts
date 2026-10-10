// Charter T1 acceptance: at least 40 Instagram URLs through decide() with
// expected results, all passing. The table is shared with the parity test.

import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';

describe('decide instagram rules', () => {
  test.each(INSTAGRAM_DECIDE_TABLE)('$name', (row) => {
    const result = decide('instagram', row.url, row.context ?? 'dms', {
      allowSharedPosts: row.allowSharedPosts ?? true,
    });
    expect({ action: result.action, to: result.to }).toEqual(row.expected);
  });
});
