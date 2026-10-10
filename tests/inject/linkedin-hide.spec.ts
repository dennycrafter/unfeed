// Charter T3 acceptance: the generated LinkedIn script hides the global nav,
// posts sections on search pages and activity sections on profiles, leaves
// the messaging thread untouched, reports routes, and enforces the rules
// inside the page as a second line of defence. Fixtures use only stable
// attributes; every class name is a fake hash.

import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { LINKEDIN_INJECT_SCRIPT } from '../../src/inject/generated/linkedin.generated';

interface Bridge {
  ReactNativeWebView: { postMessage: (data: string) => void };
}

function fixturePath(name: string): string {
  return join('tests', 'fixtures', name);
}

/** Serves the fixture for every linkedin.com page in the test. */
async function routeFixture(page: Page, fixture: string): Promise<void> {
  await page.route('https://www.linkedin.com/**', async (route) => {
    await route.fulfill({ path: fixturePath(fixture), contentType: 'text/html' });
  });
}

/** Captures postMessage calls and declares the inject settings before the
 * bundle runs (the native side prepends the same preamble). */
async function prepare(page: Page, settings?: { allowSharedPosts?: boolean; hideCounts?: boolean }): Promise<void> {
  await page.addInitScript(() => {
    const messages: unknown[] = [];
    (window as unknown as { __unfeedMessages: unknown[] }).__unfeedMessages = messages;
    (window as unknown as Bridge).ReactNativeWebView = {
      postMessage: (data: string) => messages.push(JSON.parse(data)),
    };
  });
  if (settings) {
    await page.addInitScript((stub) => {
      (window as unknown as { __UNFEED_SETTINGS__: unknown }).__UNFEED_SETTINGS__ = stub;
    }, settings);
  }
  await page.addInitScript(LINKEDIN_INJECT_SCRIPT);
}

test('messaging fixture: global nav hides, the thread survives, routes and unread report', async ({ page }) => {
  await routeFixture(page, 'linkedin-messaging.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');

  await expect(page.locator('header[role="banner"]')).toBeHidden();
  await expect(page.locator('.app-install-banner')).toBeHidden();
  await expect(page.getByText('Hey, are we still on for Thursday?')).toBeVisible();
  await expect(page.locator('main.messaging-thread')).toBeVisible();

  const messages = await page.evaluate(
    () => (window as unknown as { __unfeedMessages: Array<{ type: string; url?: string; count?: number }> }).__unfeedMessages,
  );
  expect(messages).toContainEqual({ type: 'route', url: 'https://www.linkedin.com/messaging/' });
  // The title arrives after the script runs, so poll for the count message.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const list = (window as unknown as { __unfeedMessages: Array<{ type: string; count?: number }> }).__unfeedMessages;
        return list.some((message) => message.type === 'unread' && message.count === 3);
      }),
    )
    .toBe(true);

  // Single page navigation: pushState must be reported (gotcha 2).
  await page.evaluate(() => history.pushState(null, '', '/messaging/thread/2-abc/'));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const list = (window as unknown as { __unfeedMessages: Array<{ type: string; url?: string }> }).__unfeedMessages;
        return list.some((message) => message.type === 'route' && message.url?.endsWith('/messaging/thread/2-abc/'));
      }),
    )
    .toBe(true);
});

test('messaging fixture: an in page move to the feed is bounced back by the page itself', async ({ page }) => {
  await routeFixture(page, 'linkedin-messaging.html');
  await prepare(page, { allowSharedPosts: true });
  await page.goto('https://www.linkedin.com/messaging/');

  await page.evaluate(() => history.pushState(null, '', '/feed/'));
  await expect(page).toHaveURL('https://www.linkedin.com/messaging/');
});

test('search fixture: posts chip and posts section hide, people results survive', async ({ page }) => {
  await routeFixture(page, 'linkedin-search.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/search/results/people/?keywords=ada');

  await expect(page.locator('.search-filter-chips button', { hasText: 'Posts' })).toBeHidden();
  await expect(page.locator('.search-filter-chips button', { hasText: 'People' })).toBeVisible();
  await expect(page.locator('section.search-results__posts')).toBeHidden();
  await expect(page.locator('section.search-results__people')).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});

test('profile fixture: activity and suggestions hide, identity and upsells behave', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/someone/');

  await expect(page.locator('section.profile-activity')).toBeHidden();
  await expect(page.locator('section.profile-suggestions')).toBeHidden();
  await expect(page.locator('section.profile-suggestions-more')).toBeHidden();
  await expect(page.locator('.premium-upsell-link')).toBeHidden();
  await expect(page.locator('h1.profile-name')).toBeVisible();
  await expect(page.locator('.profile-headline')).toBeVisible();
  // hideCounts defaults to false, so the count stays until the setting is on.
  await expect(page.locator('.connection-count')).toBeVisible();
});

test('profile fixture: hide counts setting removes the connection count', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page, { hideCounts: true });
  await page.goto('https://www.linkedin.com/in/someone/');

  await expect(page.locator('.connection-count')).toBeHidden();
  await expect(page.locator('.profile-headline')).toBeVisible();
});
