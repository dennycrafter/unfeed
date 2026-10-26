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

// The QA evidence platform requires a 720px shorter edge minimum, so the same
// shell is also captured wider; the charter phone capture stays above.
test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('instagram shell at the qa evidence size', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Instagram DMs (web preview)')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't1-instagram-dms-720.png') });
  });
});


// Paste a link and the LinkedIn Post button (Denis, 23 Oct 2026).
test('the link pop-up opens from the header with made-up text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open a link' }).click();
  await page.getByLabel('Link', { exact: true }).fill('https://www.instagram.com/p/MadeUp123/');
  await expect(page.getByText('Open a link', { exact: true })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't7-link-sheet.png') });
});

test('the link pop-up says when the text is not a link it opens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open a link' }).click();
  await page.getByLabel('Link', { exact: true }).fill('https://example.com/page');
  await page.getByRole('button', { name: 'Open link' }).click();
  await expect(page.getByText('That is not an Instagram or LinkedIn link.')).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't7-link-sheet-error.png') });
});

test('the top bar: Link on Instagram, QR on LinkedIn, Settings on the right of both', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open a link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't7-instagram-header.png') });
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
  await expect(page.getByRole('button', { name: 'QR' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open a link' })).toHaveCount(0);
  await page.screenshot({ path: join('docs', 'screenshots', 't7-linkedin-header.png') });
});
