// Charter T2 acceptance: screenshots of the Instagram DMs, Search, Profile and
// Stories screens from the web preview at 390x844 (charter section 10). The
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

  test('Stories button opens the native stories screen, never Instagram home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stories' }).click();
    await expect(page.getByTestId('stories-tray')).toBeVisible();
    await expect(page.getByText('Loading stories...')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-stories-loading.png') });
  });

  test('the stories screen shows its own circles', async ({ page }) => {
    await page.goto('/?demoStories=1');
    await expect(page.getByRole('button', { name: "Watch alice's story" })).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-stories.png') });
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

  test('instagram stories at the qa evidence size', async ({ page }) => {
    await page.goto('/?demoStories=1');
    await expect(page.getByRole('button', { name: "Watch alice's story" })).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-stories-720.png') });
  });
});
