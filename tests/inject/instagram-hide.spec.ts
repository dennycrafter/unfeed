// Charter T2 acceptance: the generated Instagram script run in a real
// browser against fixture pages. After injection the feed articles, grid,
// More posts section, Instagram's own nav, reels links and app banners are
// hidden, the stories tray, search box, post and DM thread stay visible,
// routes are reported on pushState, unread counts and the username arrive,
// and the in page guard redirects a feed push once native confirms the tab.

import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { INSTAGRAM_INJECT_SCRIPT } from '../../src/inject/generated/instagram.generated';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');

const FIXTURE_ROUTES: Record<string, string> = {
  '/': 'instagram-home.html',
  '/explore/search/': 'instagram-search.html',
  '/p/abc123/': 'instagram-post.html',
  '/direct/inbox/': 'instagram-dm.html',
};

type PageMessageRecord = Record<string, unknown>;

/** Serves the fixtures under their real instagram.com paths and installs the
 * postMessage bridge stub plus the generated script before content loads. */
async function openFixture(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    const store: PageMessageRecord[] = [];
    (window as unknown as { __unfeedMessages?: PageMessageRecord[] }).__unfeedMessages = store;
    Object.defineProperty(window, 'ReactNativeWebView', {
      value: { postMessage: (data: string) => store.push(JSON.parse(data) as PageMessageRecord) },
      configurable: true,
    });
  });
  await page.addInitScript(INSTAGRAM_INJECT_SCRIPT);
  await page.route('https://www.instagram.com/**', (route) => {
    const { pathname } = new URL(route.request().url());
    const fixture = FIXTURE_ROUTES[pathname];
    if (fixture) return route.fulfill({ path: join(FIXTURES, fixture), contentType: 'text/html' });
    // Placeholder for assets so layout stays deterministic and no network is
    // touched; the sized img attributes keep the anchors measurable.
    return route.fulfill({ body: '', contentType: 'text/plain' });
  });
  await page.goto(`https://www.instagram.com${path}`);
}

async function waitForMessage(page: Page, match: PageMessageRecord): Promise<void> {
  await page.waitForFunction((needle) => {
    const messages = (window as unknown as { __unfeedMessages?: PageMessageRecord[] }).__unfeedMessages ?? [];
    return messages.some((message) =>
      Object.entries(needle).every(([key, value]) => JSON.stringify(message?.[key]) === JSON.stringify(value)),
    );
  }, match);
}

async function messages(page: Page): Promise<PageMessageRecord[]> {
  return page.evaluate(
    () => (window as unknown as { __unfeedMessages?: PageMessageRecord[] }).__unfeedMessages ?? [],
  );
}

test('home fixture: feed hidden, stories tray visible, own nav hidden', async ({ page }) => {
  await openFixture(page, '/');
  await waitForMessage(page, { type: 'route', url: 'https://www.instagram.com/' });
  await expect(page.locator('[aria-label="Stories tray"]')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Feed post one' })).toBeHidden();
  await expect(page.locator('article', { hasText: 'Feed post two' })).toBeHidden();
  await expect(page.locator('[aria-label="Suggested for you"]')).toBeHidden();
  await expect(page.locator('nav[aria-label="Primary"]')).toBeHidden();
});

test('home fixture: unread count and username are reported', async ({ page }) => {
  await openFixture(page, '/');
  await waitForMessage(page, { type: 'unread', count: 3 });
  await waitForMessage(page, { type: 'ig-username', value: 'yourprofile' });
  const types = (await messages(page)).map((message) => message.type);
  expect(types).toContain('unread');
  expect(types).toContain('ig-username');
});

test('search fixture: search input visible, grid links hidden', async ({ page }) => {
  await openFixture(page, '/explore/search/');
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.locator('a[href="/p/gridone/"]')).toBeHidden();
  await expect(page.locator('a[href="/reel/gridfive/"]')).toBeHidden();
  await expect(page.locator('a[href="/tv/gridsix/"]')).toBeHidden();
});

test('post fixture: post visible, More posts and Suggested hidden', async ({ page }) => {
  await openFixture(page, '/p/abc123/');
  await expect(page.locator('article', { hasText: 'A single post' })).toBeVisible();
  await expect(page.locator('[aria-label="More posts from yourprofile"]')).toBeHidden();
  await expect(page.locator('[aria-label="Suggested for you"]')).toBeHidden();
});

test('dm fixture: thread untouched, reels link and banner hidden', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
  await expect(page.locator('[aria-label="Message from alice"]').first()).toBeVisible();
  await expect(page.locator('a[href="/reels/abc123/"]')).toBeHidden();
  await expect(page.locator('aside.hashed-app-banner')).toBeHidden();
  await waitForMessage(page, { type: 'unread', count: 2 });
});

test('route message is posted on pushState', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await page.evaluate(() => {
    history.pushState({}, '', '/explore/search/');
  });
  await waitForMessage(page, { type: 'route', url: 'https://www.instagram.com/explore/search/' });
});

test('in page guard redirects a reels push once the context is confirmed', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await page.evaluate(() => {
    const api = (window as unknown as { __UNFEED__?: { setNativeState?: (state: unknown) => void } }).__UNFEED__;
    api?.setNativeState?.({ context: 'dms', settings: { allowSharedPosts: true, hideCounts: false } });
  });
  await page.evaluate(() => {
    history.pushState({}, '', '/reels/abc/');
  });
  // The page bounces itself to the inbox, which is served the dm fixture.
  await page.waitForURL('https://www.instagram.com/direct/inbox/');
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
});

test('hideCounts setting hides follower and like counts on request', async ({ page }) => {
  await openFixture(page, '/p/abc123/');
  const countsLink = page.locator('a[href="/yourprofile/followers/"]');
  await expect(countsLink).toBeVisible();
  await page.evaluate(() => {
    const api = (window as unknown as { __UNFEED__?: { setNativeState?: (state: unknown) => void } }).__UNFEED__;
    api?.setNativeState?.({ settings: { allowSharedPosts: true, hideCounts: true } });
  });
  await expect(countsLink).toBeHidden();
  await page.evaluate(() => {
    const api = (window as unknown as { __UNFEED__?: { setNativeState?: (state: unknown) => void } }).__UNFEED__;
    api?.setNativeState?.({ settings: { allowSharedPosts: true, hideCounts: false } });
  });
  await expect(countsLink).toBeVisible();
});

test('per rule match counts are exposed for the debug screen', async ({ page }) => {
  await openFixture(page, '/');
  await page.evaluate(() => {
    const api = (window as unknown as { __UNFEED__?: { setNativeState?: (state: unknown) => void } }).__UNFEED__;
    api?.setNativeState?.({ context: 'dms', settings: { allowSharedPosts: true, hideCounts: false } });
  });
  await waitForMessage(page, { type: 'hide-stats' });
  // Stats posted at document-start see an empty page; wait until the
  // observer tick after the first rendered frame reports real counts.
  const latestStats = async (): Promise<Record<string, number>> => {
    const all = await messages(page);
    const stats = all.filter((message) => message.type === 'hide-stats').at(-1);
    const matched: unknown = stats?.matched;
    return matched && typeof matched === 'object' ? (matched as Record<string, number>) : {};
  };
  await expect
    .poll(async () => (await latestStats())['ig-home-feed'] ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(0);
  const matched = await latestStats();
  expect(matched['ig-own-nav']).toBeGreaterThan(0);
});
