// Charter T1 and T3 acceptance: the generated injected matcher must give the
// same answer as the native decide() for every URL in both tables. The bundle
// runs in a bare node VM with no window, so only the matcher is exposed there.

import vm from 'vm';
import { INSTAGRAM_INJECT_SCRIPT } from '../../src/inject/generated/instagram.generated';
import { LINKEDIN_INJECT_SCRIPT } from '../../src/inject/generated/linkedin.generated';
import { decide } from '../../src/rules/decide';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';
import { LINKEDIN_DECIDE_TABLE } from './linkedin-table';

interface ExposedMatcher {
  site: string;
  version: string;
  decide: typeof decide;
}

// A bare VM context has no standard globals; the script would find URL,
// URLSearchParams and console in any real page, so provide node's own copies.
function expose(script: string): ExposedMatcher | undefined {
  const sandbox: Record<string, unknown> = { URL, URLSearchParams, console };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  return sandbox.__UNFEED__ as ExposedMatcher | undefined;
}

const instagramExposed = expose(INSTAGRAM_INJECT_SCRIPT);
const linkedinExposed = expose(LINKEDIN_INJECT_SCRIPT);

describe('injected matcher parity', () => {
  test.each([
    ['instagram', instagramExposed],
    ['linkedin', linkedinExposed],
  ])('the bundle exposes the %s matcher', (_site, exposed) => {
    expect(exposed).toBeDefined();
    expect(typeof exposed?.decide).toBe('function');
  });

  test('the exposed sites match their bundles', () => {
    expect(instagramExposed?.site).toBe('instagram');
    expect(linkedinExposed?.site).toBe('linkedin');
  });

  test.each(INSTAGRAM_DECIDE_TABLE)('instagram: $name matches native decide', (row) => {
    const context = row.context ?? 'dms';
    const settings = { allowSharedPosts: row.allowSharedPosts ?? true };
    const native = decide('instagram', row.url, context, settings);
    expect(instagramExposed?.decide('instagram', row.url, context, settings)).toEqual(native);
  });

  test.each(LINKEDIN_DECIDE_TABLE)('linkedin: $name matches native decide', (row) => {
    const context = row.context ?? 'messages';
    const settings = { allowSharedPosts: row.allowSharedPosts ?? true };
    const native = decide('linkedin', row.url, context, settings);
    expect(linkedinExposed?.decide('linkedin', row.url, context, settings)).toEqual(native);
  });
});
