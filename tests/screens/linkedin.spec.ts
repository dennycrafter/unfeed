// LinkedIn at 390x844 from the web preview. Since 25 Oct 2026 the app draws
// its own bars on LinkedIn too (LinkedIn's are hidden by the inject script):
// Profile, Messages, Search, Post, Notifications at the bottom, QR and Link
// in the top bar. Build the web export first (npm run test:screens does this).

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const screenshot = (name: string): string => join('docs', 'screenshots', name);

async function openLinkedIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
}

test('linkedin messages at phone size with the app bars', async ({ page }) => {
  await openLinkedIn(page);
  await expect(page.getByText('LinkedIn messages (web preview)')).toBeVisible();
  await expect(page.getByText('https://www.linkedin.com/messaging/')).toBeVisible();
  await expect(page.getByRole('button', { name: 'QR' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Profile tab' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Messages tab' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Notifications tab' })).toBeVisible();
  await page.screenshot({ path: screenshot('t3-linkedin-messages.png') });
});

test('linkedin search shows the native search box over an empty page', async ({ page }) => {
  await openLinkedIn(page);
  await page.getByRole('tab', { name: 'Search tab' }).click();
  await expect(page.getByLabel('Search people')).toBeVisible();
  await expect(page.getByText('Search for people by name. Posts never show here.')).toBeVisible();
  await page.screenshot({ path: screenshot('t3-linkedin-search.png') });
});

test('linkedin notifications and profile tabs', async ({ page }) => {
  await openLinkedIn(page);
  await page.getByRole('tab', { name: 'Notifications tab' }).click();
  await expect(page.getByText('https://www.linkedin.com/notifications/')).toBeVisible();
  await page.screenshot({ path: screenshot('t3-linkedin-notifications.png') });
  await page.getByRole('tab', { name: 'Profile tab' }).click();
  await expect(page.getByText('https://www.linkedin.com/in/me/')).toBeVisible();
  await page.screenshot({ path: screenshot('t3-linkedin-profile.png') });
});

test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('linkedin messages at the qa evidence size', async ({ page }) => {
    await openLinkedIn(page);
    await expect(page.getByText('LinkedIn messages (web preview)')).toBeVisible();
    await page.screenshot({ path: screenshot('t3-linkedin-messages-720.png') });
  });
});
