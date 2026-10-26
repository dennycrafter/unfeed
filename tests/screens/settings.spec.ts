// Charter T5 acceptance: screenshots of the switcher with unread dots on both
// apps and of the settings screen, from the web preview at 390x844. The web
// preview seeds the unread badges from the URL (real counts arrive as page
// messages inside the app).

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const screenshot = (name: string): string => join('docs', 'screenshots', name);
const BOTH_UNREAD = '/?unreadInstagram=3&unreadLinkedin=2';

test.describe('settings and switcher at phone size', () => {
  test('settings screen shows every row', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText("Open friends' shared posts")).toHaveCount(0);
    await expect(page.getByText('Hide like and follower counts')).toBeVisible();
    await expect(page.getByText('Haptics')).toBeVisible();
    await expect(page.getByText('Reset to defaults')).toBeVisible();
    await expect(page.getByText(/About Unfeed/)).toBeVisible();
    await page.screenshot({ path: screenshot('t5-settings.png') });
  });

  test('the switcher shows unread dots on both apps', async ({ page }) => {
    await page.goto(BOTH_UNREAD);
    await expect(page.getByRole('tab', { name: 'Instagram, 3 unread' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'LinkedIn, 2 unread' })).toBeVisible();
    await page.screenshot({ path: screenshot('t5-switcher-instagram.png') });
  });

  test('switching to LinkedIn keeps its unread dot and opens messages', async ({ page }) => {
    await page.goto(BOTH_UNREAD);
    await page.getByRole('tab', { name: 'LinkedIn, 2 unread' }).click();
    await expect(page.getByText('https://www.linkedin.com/messaging/')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Instagram, 3 unread' })).toBeVisible();
    await page.screenshot({ path: screenshot('t5-switcher-linkedin.png') });
  });
});

// The QA evidence platform requires a 720px shorter edge minimum, so the same
// screens are captured wider; the charter phone captures stay above.
test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('settings screen at the qa evidence size', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Reset to defaults')).toBeVisible();
    await page.screenshot({ path: screenshot('t5-settings-720.png') });
  });

  test('switcher with unread dots at the qa evidence size', async ({ page }) => {
    await page.goto(BOTH_UNREAD);
    await expect(page.getByRole('tab', { name: 'LinkedIn, 2 unread' })).toBeVisible();
    await page.screenshot({ path: screenshot('t5-switcher-720.png') });
  });
});
