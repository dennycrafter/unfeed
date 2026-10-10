// Charter T1 acceptance: the generated injected matcher must give the same
// answer as the native decide() for every URL in the table. The bundle runs
// in a bare node VM with no window, so only the matcher is exposed there.

import vm from 'vm';
import { INSTAGRAM_INJECT_SCRIPT } from '../../src/inject/generated/instagram.generated';
import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';

interface ExposedMatcher {
  site: string;
  version: string;
  decide: typeof decide;
}

// A bare VM context has no standard globals; the script would find URL and
// console in any real page, so provide node's own copies here.
const sandbox: Record<string, unknown> = { URL, console };
vm.createContext(sandbox);
vm.runInContext(INSTAGRAM_INJECT_SCRIPT, sandbox);
const exposed = sandbox.__UNFEED__ as ExposedMatcher | undefined;

describe('injected matcher parity', () => {
  test('the bundle exposes the instagram matcher', () => {
    expect(exposed).toBeDefined();
    expect(exposed?.site).toBe('instagram');
    expect(typeof exposed?.decide).toBe('function');
  });

  test.each(INSTAGRAM_DECIDE_TABLE)('$name matches native decide', (row) => {
    const context = row.context ?? 'dms';
    const settings = { allowSharedPosts: row.allowSharedPosts ?? true };
    const native = decide('instagram', row.url, context, settings);
    expect(exposed?.decide('instagram', row.url, context, settings)).toEqual(native);
  });
});
