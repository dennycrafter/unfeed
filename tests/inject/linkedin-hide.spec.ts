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

test('messaging fixture: the bar stays without Home, the thread survives, routes and unread report', async ({ page }) => {
  await routeFixture(page, 'linkedin-messaging.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');

  // The app draws its own bars now (Denis, 25 Oct 2026), so LinkedIn's go.
  await expect(page.locator('header[role="banner"]')).toBeHidden();
  await expect(page.locator('a[href="/feed/"]')).toBeHidden();
  await expect(page.locator('a[href="/mynetwork/"]')).toBeHidden();
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

test('profile fixture: suggestions hide, Activity stays, identity and upsells behave', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/someone/');

  // The Activity section is one person's posts, not the feed (Denis, 25 Oct 2026).
  await expect(page.locator('section.profile-activity')).toBeVisible();
  await expect(page.getByText("Ada's latest post.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Show all posts' })).toBeVisible();
  await expect(page.locator('section.profile-suggestions')).toBeHidden();
  await expect(page.locator('section.profile-suggestions-more')).toBeHidden();
  await expect(page.locator('.premium-upsell-link')).toBeHidden();
  await expect(page.locator('h1.profile-name')).toBeVisible();
  await expect(page.locator('.profile-headline')).toBeVisible();
  // hideCounts defaults to false, so the count stays until the setting is on.
  await expect(page.locator('.connection-count')).toBeVisible();
});

test('recent activity page: every post card and the Activity heading stay', async ({ page }) => {
  await routeFixture(page, 'linkedin-recent-activity.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/someone/recent-activity/all/');
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe('/in/someone/recent-activity/all/');
  await expect(page.locator('h2', { hasText: 'Activity' })).toBeVisible();
  await expect(page.getByText("Ada's own post about engines.")).toBeVisible();
  await expect(page.getByText('Ada shared an article.')).toBeVisible();
  await expect(page.getByText("Ada's video post.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open post' })).toBeVisible();
  await expect(page.locator('.activity-tabs button', { hasText: 'Posts' })).toBeVisible();
});

test('single post page: the post card stays, it is not the feed', async ({ page }) => {
  await routeFixture(page, 'linkedin-recent-activity.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/feed/update/urn:li:activity:7001/');
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe('/feed/update/urn:li:activity:7001/');
  await expect(page.getByText("Ada's own post about engines.")).toBeVisible();
});

test('single post page stays even with the old shared posts setting off', async ({ page }) => {
  await routeFixture(page, 'linkedin-recent-activity.html');
  await prepare(page, { allowSharedPosts: false, hideCounts: false });
  await page.goto('https://www.linkedin.com/posts/ada-lovelace-engines-7001/');
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe('/posts/ada-lovelace-engines-7001/');
  await expect(page.getByText("Ada's own post about engines.")).toBeVisible();
});

test('own profile fixture: the vanity is read from the edit links while on /in/me/', async ({ page }) => {
  await routeFixture(page, 'linkedin-own-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/me/');

  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __unfeedMessages: Array<{ type: string; url?: string }> }).__unfeedMessages),
    )
    .toContainEqual({ type: 'li-own-profile', url: 'https://www.linkedin.com/in/ada-lovelace-1815/' });
});

test('own profile fixture: the bar Home button hides, a page tab called Home stays', async ({ page }) => {
  await routeFixture(page, 'linkedin-own-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/me/');

  await expect(page.locator('.bar-home')).toBeHidden();
  // The whole site bar goes now that the app has its own (Denis, 25 Oct 2026).
  await expect(page.locator('.bar-network[href="/mynetwork/"]')).toBeHidden();
  await expect(page.locator('.company-tabs .tab')).toBeVisible();
});

test('profile fixture: someone else is never reported as the own profile', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/someone/');
  await expect(page.locator('h1.profile-name')).toBeVisible();

  const messages = await page.evaluate(
    () => (window as unknown as { __unfeedMessages: Array<{ type: string }> }).__unfeedMessages,
  );
  expect(messages.some((message) => message.type === 'li-own-profile')).toBe(false);
});

test('profile fixture: hide counts setting removes the connection count', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page, { hideCounts: true });
  await page.goto('https://www.linkedin.com/in/someone/');

  await expect(page.locator('.connection-count')).toBeHidden();
  await expect(page.locator('.profile-headline')).toBeVisible();
});

test('get the app prompts: the bottom banner hides, pop-ups close, messages stay', async ({ page }) => {
  await routeFixture(page, 'linkedin-app-prompts.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');
  await expect(page.locator('.bottom-banner')).toBeHidden();
  // The pop-up with a Not now button is closed by pressing it.
  await expect(page.locator('.backdrop')).toHaveCount(0);
  // The pop-up without one is hidden with its backdrop, and scrolling comes back.
  await expect(page.locator('.backdrop-two')).toBeHidden();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  // LinkedIn's own top bar goes too; the app has its own (Denis, 25 Oct 2026).
  await expect(page.locator('header[role="banner"]')).toBeHidden();
  await expect(page.getByText('Can you send me the deck before Friday?')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download the deck' })).toBeVisible();
});

test('post composer: stays open after the site drops shareActive, feed hidden, then back to Messages', async ({ page }) => {
  await routeFixture(page, 'linkedin-composer.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/feed/?shareActive=true');
  await page.waitForFunction(() => location.search === '');
  await page.waitForTimeout(600);
  // Still on the bare feed address with the composer open: not bounced.
  expect(new URL(page.url()).pathname).toBe('/feed/');
  await expect(page.getByRole('textbox', { name: 'Text editor for creating content' })).toBeVisible();
  await expect(page.getByText("Somebody's feed post")).toBeHidden();
  const messages = await page.evaluate(
    () => (window as unknown as { __unfeedMessages: Array<{ type: string; open?: boolean }> }).__unfeedMessages,
  );
  expect(messages).toContainEqual({ type: 'li-composer', open: true });
  // Posting closes the composer; the session ends and the page goes to Messages.
  await page.getByRole('button', { name: 'Post' }).click();
  await page.waitForURL('https://www.linkedin.com/messaging/', { timeout: 10_000 });
});

test('post composer: the bare feed without a composer still bounces to Messages', async ({ page }) => {
  await routeFixture(page, 'linkedin-composer.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForURL('https://www.linkedin.com/messaging/');
});

// The app's own bars (Denis, 25 Oct 2026): LinkedIn's top and bottom bars go,
// the page itself stays.
test('own bars: the top header and the pinned bottom bar hide, the thread stays', async ({ page }) => {
  await routeFixture(page, 'linkedin-bottom-bar.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');
  await expect(page.locator('header.top-bar')).toBeHidden();
  await expect(page.locator('nav.bottom-nav')).toBeHidden();
  await expect(page.getByText('See you at nine.')).toBeVisible();
  // Nothing of the old Profile item copy is added any more.
  await expect(page.locator('[data-unfeed-profile]')).toHaveCount(0);
});

test('own bars: a bar without a list or nav element hides too', async ({ page }) => {
  await routeFixture(page, 'linkedin-own-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/me/');
  await expect(page.locator('div.bottom-bar')).toBeHidden();
  await expect(page.locator('h1.profile-name')).toBeVisible();
  await expect(page.locator('.company-tabs .tab')).toBeVisible();
});

test('own bars: a header with a single link back to Messages is page content and stays', async ({ page }) => {
  await routeFixture(page, 'linkedin-profile.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/in/someone/');
  await expect(page.locator('header[role="banner"] a[href="/messaging/"]')).toBeVisible();
  await expect(page.locator('h1.profile-name')).toBeVisible();
});

// Clean and basic (Denis, 26 Oct 2026): the forced colours and font broke
// Messages, so the page keeps LinkedIn's own look.
test('no colours or fonts are forced on the page', async ({ page }) => {
  await routeFixture(page, 'linkedin-messaging.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');
  const canvas = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-background-canvas').trim());
  expect(canvas).toBe('');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('normal');
});

test('own bars: a pinned full screen shell is the page, not a bar, and stays', async ({ page }) => {
  await routeFixture(page, 'linkedin-app-shell.html');
  await prepare(page);
  await page.goto('https://www.linkedin.com/messaging/');
  await expect(page.locator('div.tabbar')).toBeHidden();
  await expect(page.getByText('Lunch on Friday?')).toBeVisible();
  await expect(page.locator('div.shell')).toBeVisible();
});
