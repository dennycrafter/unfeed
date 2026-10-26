// Charter T2 acceptance: the generated Instagram script run in a real
// browser against fixture pages. After injection the feed, grid, More posts
// section, Instagram's own nav, reels links and app banners are hidden, the
// search box, post and DM thread stay visible, routes are reported on
// pushState, unread counts and the own username arrive, and the in page
// guard redirects a feed push, returning to the tab's last page for home.

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
  '/direct/t/videos/': 'instagram-videos.html',
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

// No stories tray (Denis, 26 Oct 2026): home is redirected in every tab and
// never paints while it happens.
test('home never paints, in any tab, and is sent away', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'dms' });
  const blankAtPush = await page.evaluate(() => {
    history.pushState({}, '', '/');
    return getComputedStyle(document.body).visibility;
  });
  expect(blankAtPush).toBe('hidden');
  await page.waitForURL('https://www.instagram.com/direct/inbox/');
});

test('the old stories tray context no longer lets home load', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'stories-tray' });
  await page.evaluate(() => history.pushState({}, '', '/'));
  await page.waitForURL('https://www.instagram.com/direct/inbox/');
  const types = (await messages(page)).map((message) => message.type);
  expect(types).not.toContain('ig-stories');
});

// Home and feed redirects go back (Denis, 26 Oct 2026): a story that ends on
// a friend's profile returns there instead of jumping to DMs.
test('a story ending returns to the last page of the tab, not DMs', async ({ page }) => {
  await openFixture(page, '/yourprofile/', { context: 'profile' });
  await waitForMessage(page, { type: 'route', url: 'https://www.instagram.com/yourprofile/' });
  await page.evaluate(() => {
    history.pushState({}, '', '/stories/yourprofile/123/');
    history.pushState({}, '', '/');
  });
  await page.waitForURL('https://www.instagram.com/yourprofile/');
});

test('videos are kept inline so iOS never takes them full screen', async ({ page }) => {
  await openFixture(page, '/direct/t/videos/', { context: 'dms' });
  await expect(page.locator('#plain')).toHaveAttribute('playsinline', '');
  await expect(page.locator('#plain')).toHaveAttribute('webkit-playsinline', '');
});

test('unread count and the own username come from the nav bar', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'dms', fixture: 'instagram-own-nav.html' });
  await waitForMessage(page, { type: 'unread', count: 2 });
  await waitForMessage(page, { type: 'ig-username', value: 'real_denis' });
  // A friend's avatar (a story ring, a thread) is never taken for Denis.
  const names = (await messages(page)).filter((message) => message.type === 'ig-username').map((message) => message.value);
  expect(names).toEqual(['real_denis']);
});

test('the own profile page gives the username through its Edit profile link', async ({ page }) => {
  await openFixture(page, '/yourprofile/', { context: 'profile', fixture: 'instagram-own-profile-edit.html' });
  await waitForMessage(page, { type: 'ig-username', value: 'yourprofile' });
});

test('a page without the nav bar never reports a username', async ({ page }) => {
  await openFixture(page, '/p/abc123/');
  await page.waitForTimeout(800);
  const types = (await messages(page)).map((message) => message.type);
  expect(types).not.toContain('ig-username');
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
  await openFixture(page, '/explore/search/', { context: 'search' });
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
    .poll(async () => (await latestStats())['ig-explore-grid'] ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(0);
  const matched = await latestStats();
  expect(matched['ig-home-feed']).toBe(0);
});

// Sound (Denis, 25 Oct 2026): Instagram's site starts every video muted.
async function play(page: Page, id: string): Promise<void> {
  await page.evaluate((videoId) => document.getElementById(videoId)?.dispatchEvent(new Event('play')), id);
}

async function videoState(page: Page, id: string): Promise<{ muted: boolean; volume: number }> {
  return page.evaluate((videoId) => {
    const video = document.getElementById(videoId) as HTMLVideoElement;
    return { muted: video.muted, volume: video.volume };
  }, id);
}

test("sound: a playing video is unmuted through Instagram's own sound button, once", async ({ page }) => {
  await openFixture(page, '/direct/t/videos/', { context: 'dms' });
  expect((await videoState(page, 'with-button')).muted).toBe(true);
  await play(page, 'with-button');
  await expect.poll(async () => (await videoState(page, 'with-button')).muted).toBe(false);
  await expect(page.locator('svg[aria-label="Audio is playing"]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { __sitePresses: number }).__sitePresses)).toBe(1);
  // Playing again (a replay, a seek) never presses it a second time.
  await play(page, 'with-button');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { __sitePresses: number }).__sitePresses)).toBe(1);
});

test('sound: a video without a sound button is unmuted at full volume', async ({ page }) => {
  await openFixture(page, '/direct/t/videos/', { context: 'dms' });
  await page.evaluate(() => {
    (document.getElementById('plain') as HTMLVideoElement).volume = 0.2;
  });
  await play(page, 'plain');
  await expect.poll(() => videoState(page, 'plain')).toEqual({ muted: false, volume: 1 });
  // The other video's button is never pressed for this one.
  expect(await page.evaluate(() => (window as unknown as { __sitePresses: number }).__sitePresses)).toBe(0);
});

test('sound: once Denis taps a sound button himself, the app stops changing sound', async ({ page }) => {
  await openFixture(page, '/direct/t/videos/', { context: 'dms' });
  await play(page, 'with-button');
  await expect.poll(async () => (await videoState(page, 'with-button')).muted).toBe(false);
  await page.waitForTimeout(900);
  // Denis mutes it with a real tap.
  await page.locator('[aria-label="Toggle audio"]').click();
  expect((await videoState(page, 'with-button')).muted).toBe(true);
  await play(page, 'with-button');
  await play(page, 'later');
  await page.waitForTimeout(500);
  expect((await videoState(page, 'with-button')).muted).toBe(true);
  expect((await videoState(page, 'later')).muted).toBe(true);
});

test('sound: muting a video by other means also counts as his choice', async ({ page }) => {
  await openFixture(page, '/direct/t/videos/', { context: 'dms' });
  await play(page, 'plain');
  await expect.poll(async () => (await videoState(page, 'plain')).muted).toBe(false);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    (document.getElementById('plain') as HTMLVideoElement).muted = true;
  });
  await page.waitForTimeout(100);
  await play(page, 'later');
  await page.waitForTimeout(500);
  expect((await videoState(page, 'later')).muted).toBe(true);
});

test('the in-page guard reports each bounce with its rule for Blocked pages', async ({ page }) => {
  await openFixture(page, '/direct/inbox/', { context: 'dms' });
  // The page reloads on the bounce, so keep what it posts across the hop.
  await page.evaluate(() => {
    const bridge = (window as unknown as { ReactNativeWebView: { postMessage: (data: string) => void } }).ReactNativeWebView;
    const original = bridge.postMessage;
    bridge.postMessage = (data: string) => {
      sessionStorage.setItem('posted', `${sessionStorage.getItem('posted') ?? ''}${data}\n`);
      original(data);
    };
  });
  await page.evaluate(() => history.pushState({}, '', '/explore/'));
  await page.waitForURL('https://www.instagram.com/explore/search/');
  const posted = await page.evaluate(() => (sessionStorage.getItem('posted') ?? '').trim().split('\n').map((line) => JSON.parse(line)));
  expect(posted).toContainEqual({
    type: 'bounce',
    url: 'https://www.instagram.com/explore/',
    rule: 'ig-7-explore',
    to: '/explore/search/',
  });
});
