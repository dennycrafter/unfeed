// Charter T4 acceptance: screenshots of the camera permission explainer, My
// code with a made-up profile URL, the My code empty state and the scan
// result sheet, at 390x844 from the web preview. The ?scan= and ?profile=
// params prefill the sheet and My code (assumption 21 in ASSUMPTIONS.md).
// Build the web export first (npm run test:screens does this).

import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const SCAN_PROFILE_URL = 'https://www.linkedin.com/in/ada-lovelace/';
const MY_PROFILE_URL = 'https://www.linkedin.com/in/denis-popov/';

async function openQrScreen(page: import('@playwright/test').Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
  // The QR panel opens from the header since 15 Oct 2026.
  await page.getByRole('button', { name: 'QR' }).click();
}

test('scanner shows the camera permission explainer at phone size', async ({ page }) => {
  await openQrScreen(page);
  await expect(page.getByText('Scan a QR code')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Allow camera' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-scanner-explainer.png') });
});

test('scan result sheet at phone size and routing to the profile', async ({ page }) => {
  await openQrScreen(page, `/?scan=${encodeURIComponent(SCAN_PROFILE_URL)}`);
  await expect(page.getByTestId('scan-result-sheet')).toBeVisible();
  await expect(page.getByText('LinkedIn profile')).toBeVisible();
  await expect(page.getByText(SCAN_PROFILE_URL)).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-scan-result-sheet.png') });

  // Open in LinkedIn closes the panel and opens the scanned profile behind it.
  await page.getByRole('button', { name: 'Open in LinkedIn' }).click();
  await expect(page.getByText('LinkedIn (web preview)')).toBeVisible();
  await expect(page.getByText(SCAN_PROFILE_URL)).toBeVisible();
});

test('the QR panel closes from its Close button', async ({ page }) => {
  await openQrScreen(page);
  await expect(page.getByText('Scan a QR code')).toBeVisible();
  await page.getByRole('button', { name: 'Close QR' }).click();
  await expect(page.getByText('LinkedIn (web preview)')).toBeVisible();
});

test('my code empty state at phone size', async ({ page }) => {
  await openQrScreen(page);
  await page.getByRole('tab', { name: 'My code segment' }).click();
  await expect(page.getByText('No LinkedIn profile link saved yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find my profile' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Or type it in Settings' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-my-code-empty.png') });
});

test('my code with a made-up profile URL at phone size', async ({ page }) => {
  await openQrScreen(page, `/?profile=${encodeURIComponent(MY_PROFILE_URL)}`);
  await page.getByRole('tab', { name: 'My code segment' }).click();
  await expect(page.getByTestId('my-code-qr')).toBeVisible();
  await expect(page.getByText(MY_PROFILE_URL)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share link' })).toBeVisible();
  await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-my-code.png') });
});

// The QA evidence platform requires a 720px shorter edge minimum, so the same
// four states are also captured wider; the charter phone captures stay above.
test.describe('qa capture', () => {
  test.use({ viewport: { width: 720, height: 844 } });

  test('scanner explainer at the qa evidence size', async ({ page }) => {
    await openQrScreen(page);
    await expect(page.getByText('Scan a QR code')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-scanner-explainer-720.png') });
  });

  test('scan result sheet at the qa evidence size', async ({ page }) => {
    await openQrScreen(page, `/?scan=${encodeURIComponent(SCAN_PROFILE_URL)}`);
    await expect(page.getByTestId('scan-result-sheet')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-scan-result-sheet-720.png') });
  });

  test('my code empty state at the qa evidence size', async ({ page }) => {
    await openQrScreen(page);
    await page.getByRole('tab', { name: 'My code segment' }).click();
    await expect(page.getByText('No LinkedIn profile link saved yet.')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-my-code-empty-720.png') });
  });

  test('my code at the qa evidence size', async ({ page }) => {
    await openQrScreen(page, `/?profile=${encodeURIComponent(MY_PROFILE_URL)}`);
    await page.getByRole('tab', { name: 'My code segment' }).click();
    await expect(page.getByTestId('my-code-qr')).toBeVisible();
    await page.screenshot({ path: join('docs', 'screenshots', 't4-qr-my-code-720.png') });
  });
});
