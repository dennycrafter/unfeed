// Charter T2 acceptance: screenshots of the Instagram DMs, Search, Profile and
// Stories screens from the web preview at 390x844 (charter section 10). The
// placeholder host shows the URL the native WebView would load, so each
// capture also asserts the guard answer for its tab.

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const screenshot = (name: string): string => join('docs', 'screenshots', name);

test.describe('instagram screens at phone size', () => {
  test('DMs tab opens the inbox', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('https://www.instagram.com/direct/inbox/')).toBeVisible();
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

  test('Stories button opens the stories tray on the home path', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stories' }).click();
    await expect(page.getByText('https://www.instagram.com/').first()).toBeVisible();
    await expect(page.getByText('tab: stories')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-stories.png') });
  });
});

// Instagram My code (stretch S1): the fourth Instagram tab shows the profile
// QR, seeded on the web preview with the ?igUsername= param, the same split
// as the unread seeds in the shell.
test.describe('instagram my code at phone size', () => {
  test('my code shows the profile QR for the detected username', async ({ page }) => {
    await page.goto(`/?igUsername=${encodeURIComponent('denis')}`);
    await page.getByRole('tab', { name: 'QR tab' }).click();
    await expect(page.getByTestId('my-code-qr')).toBeVisible();
    await expect(page.getByText('https://www.instagram.com/denis/')).toBeVisible();
    await page.screenshot({ path: screenshot('s1-instagram-my-code.png') });
  });

  test('my code empty state offers the profile detour', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'QR tab' }).click();
    await expect(page.getByText('No Instagram profile link saved yet.')).toBeVisible();
    await page.screenshot({ path: screenshot('s1-instagram-my-code-empty.png') });
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
    await page.goto('/');
    await page.getByRole('button', { name: 'Stories' }).click();
    await expect(page.getByText('tab: stories')).toBeVisible();
    await page.screenshot({ path: screenshot('t2-instagram-stories-720.png') });
  });

  test('instagram my code at the qa evidence size', async ({ page }) => {
    await page.goto(`/?igUsername=${encodeURIComponent('denis')}`);
    await page.getByRole('tab', { name: 'QR tab' }).click();
    await expect(page.getByTestId('my-code-qr')).toBeVisible();
    await page.screenshot({ path: screenshot('s1-instagram-my-code-720.png') });
  });

  test('instagram my code empty state at the qa evidence size', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'QR tab' }).click();
    await expect(page.getByText('No Instagram profile link saved yet.')).toBeVisible();
    await page.screenshot({ path: screenshot('s1-instagram-my-code-empty-720.png') });
  });
});
