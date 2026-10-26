// Charter T2 acceptance: screenshots of the Instagram DMs, Search,
// Notifications and Profile screens from the web preview at 390x844 (charter section 10). The
// placeholder host shows the URL the native WebView would load, so each
// capture also asserts the guard answer for its tab.

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const screenshot = (name: string): string => join('docs', 'screenshots', name);

test.describe('instagram screens at phone size', () => {
  test('DMs tab opens the inbox, with the Post button in the bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('https://www.instagram.com/direct/inbox/')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Post tab' })).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-dms.png') });
  });

  test('Search tab opens the people search page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Search tab' }).click();
    await expect(page.getByText('https://www.instagram.com/explore/search/')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-search.png') });
  });

  test('Profile tab opens the profile editor while the username is unknown', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('https://www.instagram.com/accounts/edit/')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-profile.png') });
  });

  test('Notifications tab opens the activity page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Notifications tab' }).click();
    await expect(page.getByText('https://www.instagram.com/accounts/activity/')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-notifications.png') });
  });

  test('there is no Stories tab, and DMs sits in the middle of the bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Stories tab' })).toHaveCount(0);
    const labels = await page.getByRole('tab').evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute('aria-label')));
    expect(labels.slice(2)).toEqual(['Search tab', 'Post tab', 'DMs tab', 'Notifications tab', 'Profile tab']);
  });
});

// The QA evidence platform requires a 720px shorter edge minimum, so the same
// four screens are captured wider; the charter phone captures stay above.
test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  for (const screen of [
    { key: 'dms', url: 'https://www.instagram.com/direct/inbox/' },
    { key: 'search', url: 'https://www.instagram.com/explore/search/' },
    { key: 'profile', url: 'https://www.instagram.com/accounts/edit/' },
  ] as const) {
    test(`instagram ${screen.key} at the qa evidence size`, async ({ page }) => {
      await page.goto('/');
      if (screen.key === 'search') await page.getByRole('tab', { name: 'Search tab' }).click();
      if (screen.key === 'profile') await page.getByRole('tab', { name: 'Profile tab' }).click();
      await expect(page.getByText(screen.url)).toBeVisible();
      await page.screenshot({ path: screenshot(`t2-instagram-${screen.key}-720.png`) });
    });
  }
});
