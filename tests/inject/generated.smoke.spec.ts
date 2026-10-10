// T1 smoke check: the committed bundle is valid in a real browser, not just
// in the node vm parity sandbox.

import { expect, test } from '@playwright/test';
import { INSTAGRAM_INJECT_SCRIPT } from '../../src/inject/generated/instagram.generated';

test('the generated instagram bundle loads and exposes the matcher', async ({ page }) => {
  await page.addInitScript(INSTAGRAM_INJECT_SCRIPT);
  await page.goto('about:blank');
  const exposed = await page.evaluate(() => {
    const api = (window as { __UNFEED__?: { site?: string; decide?: unknown } }).__UNFEED__;
    return { site: api?.site, hasDecide: typeof api?.decide === 'function' };
  });
  expect(exposed.site).toBe('instagram');
  expect(exposed.hasDecide).toBe(true);
});
