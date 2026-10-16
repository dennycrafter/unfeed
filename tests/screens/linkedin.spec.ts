// LinkedIn at 390x844 from the web preview. Since 15 Oct 2026 LinkedIn keeps
// its own top and bottom bars (Home hidden by the inject script), so Unfeed
// draws no bottom bar here; the header's left button opens the QR panel.
// Build the web export first (npm run test:screens does this).

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

async function openLinkedIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
}

test('linkedin messages at phone size, no Unfeed bottom bar, QR in the header', async ({ page }) => {
  await openLinkedIn(page);
  await expect(page.getByText('LinkedIn (web preview)')).toBeVisible();
  await expect(page.getByText('https://www.linkedin.com/messaging/')).toBeVisible();
  await expect(page.getByRole('button', { name: 'QR' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Messages tab' })).toHaveCount(0);
  await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-messages.png') });
});

test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('linkedin messages at the qa evidence size', async ({ page }) => {
    await openLinkedIn(page);
    await expect(page.getByText('LinkedIn (web preview)')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't3-linkedin-messages-720.png') });
  });
});
