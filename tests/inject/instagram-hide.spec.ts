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
  '/yourprofile/': 'instagram-profile.html',
};

type PageMessageRecord = Record<string, unknown>;

/** Serves the fixtures under their real instagram.com paths and installs the
 * postMessage bridge stub plus the generated script before content loads.
 * The native side declares the tab context and settings through the preamble
 * (src/inject/common.ts), so tests that load pages with a context dependent
 * rule, like the stories tray on `/`, declare them the same way. */
async function openFixture(
  page: Page,
  path: string,
  native: { context?: string; settings?: Record<string, unknown>; fixture?: string } = {},
): Promise<void> {
  await page.addInitScript(() => {
    const store: PageMessageRecord[] = [];
    (window as unknown as { __unfeedMessages?: PageMessageRecord[] }).__unfeedMessages = store;
    Object.defineProperty(window, 'ReactNativeWebView', {
      value: { postMessage: (data: string) => store.push(JSON.parse(data) as PageMessageRecord) },
      configurable: true,
    });
  });
  if (native.context || native.settings) {
    await page.addInitScript((state) => {
      if (state.context) {
        (window as unknown as { __UNFEED_CONTEXT__?: string }).__UNFEED_CONTEXT__ = state.context;
      }
      if (state.settings) {
        (window as unknown as { __UNFEED_SETTINGS__?: Record<string, unknown> }).__UNFEED_SETTINGS__ = state.settings;
      }
    }, native);
  }
  await page.addInitScript(INSTAGRAM_INJECT_SCRIPT);
  await page.route('https://www.instagram.com/**', (route) => {
    const { pathname } = new URL(route.request().url());
    const fixture = pathname === new URL(path, 'https://www.instagram.com').pathname && native.fixture ? native.fixture : FIXTURE_ROUTES[pathname];
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
  // The home page only loads in stories context (charter section 8.6), so the
  // guard sees a stories visit and lets it through.
  await openFixture(page, '/', { context: 'stories' });
  await waitForMessage(page, { type: 'route', url: 'https://www.instagram.com/' });
  await expect(page.locator('[aria-label="Stories tray"]')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Feed post one' })).toBeHidden();
  await expect(page.locator('article', { hasText: 'Feed post two' })).toBeHidden();
  await expect(page.locator('[aria-label="Suggested for you"]')).toBeHidden();
  await expect(page.locator('nav[aria-label="Primary"]')).toBeHidden();
});

test('stories button: tray and feed in one wrapper, only the tray shows', async ({ page }) => {
  await openFixture(page, '/', { context: 'stories', fixture: 'instagram-home-nested.html' });
  await expect(page.locator('[aria-label="Story by alice, not seen"]')).toBeVisible();
  await expect(page.locator('[aria-label="Your story"]')).toBeVisible();
  await expect(page.locator('.feed-post').first()).toBeHidden();
  await expect(page.locator('.feed-post').nth(1)).toBeHidden();
  await expect(page.locator('#unfeed-stories-note')).toHaveCount(0);
});

test('stories button: a home page with no stories says so instead of showing the feed', async ({ page }) => {
  await page.clock.install();
  await openFixture(page, '/', { context: 'stories', fixture: 'instagram-post.html' });
  await expect(page.locator('main').first()).toBeHidden();
  await page.clock.runFor(9000);
  await expect(page.locator('#unfeed-stories-note')).toBeVisible();
});

test('videos are kept inline so iOS never takes them full screen', async ({ page }) => {
  await openFixture(page, '/', { context: 'stories', fixture: 'instagram-home-nested.html' });
  await expect(page.locator('video.feed-video')).toHaveAttribute('playsinline', '');
  await expect(page.locator('video.feed-video')).toHaveAttribute('webkit-playsinline', '');
});

test('home fixture: unread count and username are reported', async ({ page }) => {
  await openFixture(page, '/', { context: 'stories' });
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

test('dm fixture: thread untouched, Reels tab link and banner hidden, shared reels and posts stay', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
  await expect(page.locator('[aria-label="Message from alice"]').first()).toBeVisible();
  await expect(page.locator('nav a[href="/reels/"]')).toBeHidden();
  // Single reels and posts a friend sends are not a feed (Denis, 25 Oct 2026).
  await expect(page.locator('a[href="/reels/abc123/"]')).toBeVisible();
  await expect(page.locator('a[href="/reel/Xyz789/"]')).toBeVisible();
  await expect(page.locator('a[href="/p/Post456/"]')).toBeVisible();
  await expect(page.locator('aside.hashed-app-banner')).toBeHidden();
  await waitForMessage(page, { type: 'unread', count: 2 });
});

test('profile fixture: the pinned nav bar without a nav element hides, the profile stays', async ({ page }) => {
  await openFixture(page, '/yourprofile/');
  await expect(page.locator('div.bar')).toBeHidden();
  await expect(page.locator('main.profile')).toBeVisible();
  await expect(page.locator('.profile-header')).toBeVisible();
  await expect(page.locator('.profile-options')).toBeVisible();
  // The profile's own Reels tab is content, not navigation.
  await expect(page.locator('.profile-tab-reels')).toBeVisible();
});

test('profile fixture: the Use the app sheet hides', async ({ page }) => {
  await openFixture(page, '/yourprofile/');
  await expect(page.locator('div.app-sheet')).toBeHidden();
  await expect(page.locator('.profile-username')).toBeVisible();
});

test('the Post hook shows a sheet whose button presses the hidden New post control', async ({ page }) => {
  await openFixture(page, '/yourprofile/');
  await expect(page.locator('div.bar')).toBeHidden();
  await page.evaluate(() => (window as unknown as { __UNFEED_CREATE__: () => void }).__UNFEED_CREATE__());
  // iOS needs a real tap inside the page to open the photo picker, so the
  // control is pressed from the sheet, never straight from native.
  expect(await page.evaluate(() => (window as unknown as { __createPressed?: boolean }).__createPressed)).toBeFalsy();
  const sheet = page.getByRole('dialog', { name: 'New post' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Choose photo or video' }).click();
  expect(await page.evaluate(() => (window as unknown as { __createPressed?: boolean }).__createPressed)).toBe(true);
  await expect(sheet).toHaveCount(0);
});

test('the Post sheet can be cancelled', async ({ page }) => {
  await openFixture(page, '/yourprofile/');
  await page.evaluate(() => (window as unknown as { __UNFEED_CREATE__: () => void }).__UNFEED_CREATE__());
  await page.getByRole('dialog', { name: 'New post' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog', { name: 'New post' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __createPressed?: boolean }).__createPressed)).toBeFalsy();
});

test('the Post hook reports a page without a New post control', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await page.evaluate(() => (window as unknown as { __UNFEED_CREATE__: () => void }).__UNFEED_CREATE__());
  await waitForMessage(page, { type: 'ig-create-missing' });
});

test('route message is posted on pushState', async ({ page }) => {
  await openFixture(page, '/direct/inbox/');
  await page.evaluate(() => {
    history.pushState({}, '', '/explore/search/');
  });
  await waitForMessage(page, { type: 'route', url: 'https://www.instagram.com/explore/search/' });
});

test('in page guard redirects a reels tab push under a declared context', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'dms' });
  await page.evaluate(() => {
    history.pushState({}, '', '/reels/');
  });
  // The page bounces itself to the inbox, which is served the dm fixture.
  await page.waitForURL('https://www.instagram.com/direct/inbox/');
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
});

test('in page guard sends a single reel under reels to its own page, keeping the code', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'dms' });
  await page.evaluate(() => {
    history.pushState({}, '', '/reels/CxYz9/');
  });
  await page.waitForURL('https://www.instagram.com/reel/CxYz9/');
});

test('in page guard leaves a single post alone even with shared posts off', async ({ page }) => {
  await openFixture(page, '/p/abc123/', { context: 'dms', settings: { allowSharedPosts: false, hideCounts: false } });
  await expect(page.locator('article', { hasText: 'A single post' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/p/abc123/');
});

test('hideCounts setting hides follower and like counts on request', async ({ page }) => {
  // Settings are read once at document-start from the preamble, so each
  // variant is a fresh load, matching how the native app reloads on change.
  const countsLink = page.locator('a[href="/yourprofile/followers/"]');
  await openFixture(page, '/p/abc123/', { settings: { allowSharedPosts: true, hideCounts: true } });
  await expect(countsLink).toBeHidden();
  await openFixture(page, '/p/abc123/', { settings: { allowSharedPosts: true, hideCounts: false } });
  await expect(countsLink).toBeVisible();
});

test('per rule match counts are exposed for the debug screen', async ({ page }) => {
  await openFixture(page, '/', { context: 'stories' });
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
