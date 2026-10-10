// Charter T3 acceptance: screenshots of the LinkedIn Messages, Search (with
// recent searches open) and Profile screens at 390x844 from the web preview.
// Build the web export first (npm run test:screens does this).

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

async function openLinkedIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
}

test('linkedin messages at phone size', async ({ page }) => {
  await openLinkedIn(page);
  await expect(page.getByText('LinkedIn messages (web preview)')).toBeVisible();
  await expect(page.getByText('https://www.linkedin.com/messaging/')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Messages tab' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-messages.png') });
});

test('linkedin search with recent searches at phone size', async ({ page }) => {
  await openLinkedIn(page);
  await page.getByRole('tab', { name: 'Search tab' }).click();
  await expect(page.getByText('LinkedIn search (web preview)')).toBeVisible();

  const input = page.getByLabel('Search people');
  await input.fill('Ada Lovelace');
  await input.press('Enter');
  await expect(page.getByText('https://www.linkedin.com/search/results/people/?keywords=Ada%20Lovelace')).toBeVisible();

  // Reopen the search tab and focus the bar to show the recents list.
  await page.getByRole('tab', { name: 'Messages tab' }).click();
  await page.getByRole('tab', { name: 'Search tab' }).click();
  await input.click();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-search.png') });
});

test('linkedin profile at phone size', async ({ page }) => {
  await openLinkedIn(page);
  await page.getByRole('tab', { name: 'Profile tab' }).click();
  await expect(page.getByText('LinkedIn profile (web preview)')).toBeVisible();
  await expect(page.getByText('https://www.linkedin.com/in/me/')).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-profile.png') });
});

test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('linkedin messages at the qa evidence size', async ({ page }) => {
    await openLinkedIn(page);
    await expect(page.getByText('LinkedIn messages (web preview)')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-messages-720.png') });
  });

  test('linkedin search at the qa evidence size', async ({ page }) => {
    await openLinkedIn(page);
    await page.getByRole('tab', { name: 'Search tab' }).click();
    await expect(page.getByText('LinkedIn search (web preview)')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-search-720.png') });
  });

  test('linkedin profile at the qa evidence size', async ({ page }) => {
    await openLinkedIn(page);
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('LinkedIn profile (web preview)')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-profile-720.png') });
  });
});
