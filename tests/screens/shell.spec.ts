// Charter T1 acceptance: the web preview at 390x844 shows the native shell
// with the Instagram placeholder on DMs.

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

test('instagram shell shows the DMs placeholder at phone size', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Instagram DMs (web preview)')).toBeVisible();
  await expect(page.getByText('https://www.instagram.com/direct/inbox/')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'DMs tab' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Instagram' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't1-instagram-dms.png') });
});
