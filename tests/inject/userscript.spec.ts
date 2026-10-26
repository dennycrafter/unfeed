// Charter T6 acceptance: both built userscripts run against the same fixture
// pages as the injected scripts and get the same results. Unlike the inject
// specs, there is no native side here and no preamble: no ReactNativeWebView
// stub, no declared settings or tab context, exactly what a userscript
// manager gives. Defaults apply (allowSharedPosts on, hideCounts off) and the
// in page guard is the only line of defence, so a blocked page bounces.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Site } from '../../src/rules/decide';
import { splitUserScript } from '../../src/userscript/header';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');

function userscriptBody(site: Site): string {
  const raw = readFileSync(join(process.cwd(), 'userscripts', `unfeed-${site}.user.js`), 'utf8');
  return splitUserScript(raw).body;
}

const INSTAGRAM_ROUTES: Record<string, string> = {
  '/': 'instagram-home.html',
  '/direct/inbox/': 'instagram-dm.html',
  '/explore/search/': 'instagram-search.html',
  '/p/abc123/': 'instagram-post.html',
};

const LINKEDIN_ROUTES: Record<string, string> = {
  '/': 'linkedin-messaging.html',
  '/messaging/': 'linkedin-messaging.html',
  '/search/results/people/': 'linkedin-search.html',
  '/in/someone/': 'linkedin-profile.html',
};

/** Serves the fixtures under their real hosts and installs the userscript
 * body before content loads. No bridge, no preamble: a real userscript
 * environment (src/inject/common.ts falls back to console when there is no
 * native side, and readInjectSettings falls back to defaults). */
async function openFixture(
  page: Page,
  site: Site,
  host: string,
  path: string,
  routes: Record<string, string>,
): Promise<void> {
  await page.addInitScript(userscriptBody(site));
  await page.route(`https://${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const fixture = routes[pathname];
    if (fixture) return route.fulfill({ path: join(FIXTURES, fixture), contentType: 'text/html' });
    return route.fulfill({ body: '', contentType: 'text/plain' });
  });
  await page.goto(`https://${host}${path}`);
}

test('instagram userscript: the home feed bounces to DMs with no native side', async ({ page }) => {
  await openFixture(page, 'instagram', 'www.instagram.com', '/', INSTAGRAM_ROUTES);
  // No preamble means the neutral context, so rule ig-5 sends home to DMs.
  await page.waitForURL('https://www.instagram.com/direct/inbox/');
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
});

test('instagram userscript: search fixture matches the in app results', async ({ page }) => {
  await openFixture(page, 'instagram', 'www.instagram.com', '/explore/search/', INSTAGRAM_ROUTES);
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.locator('a[href="/p/gridone/"]')).toBeHidden();
  await expect(page.locator('a[href="/reel/gridfive/"]')).toBeHidden();
  await expect(page.locator('a[href="/tv/gridsix/"]')).toBeHidden();
});

test('instagram userscript: dm fixture keeps the thread and shared reels, hides the Reels tab and banners', async ({ page }) => {
  await openFixture(page, 'instagram', 'www.instagram.com', '/direct/inbox/', INSTAGRAM_ROUTES);
  await expect(page.locator('main[aria-label="Conversation"]')).toBeVisible();
  await expect(page.locator('[aria-label="Message from alice"]').first()).toBeVisible();
  await expect(page.locator('nav a[href="/reels/"]')).toBeHidden();
  // A single reel a friend sends stays (Denis, 25 Oct 2026).
  await expect(page.locator('a[href="/reels/abc123/"]')).toBeVisible();
  await expect(page.locator('aside.hashed-app-banner')).toBeHidden();
});

test('instagram userscript: post fixture keeps the post, hides More posts', async ({ page }) => {
  await openFixture(page, 'instagram', 'www.instagram.com', '/p/abc123/', INSTAGRAM_ROUTES);
  await expect(page.locator('article', { hasText: 'A single post' })).toBeVisible();
  await expect(page.locator('[aria-label="More posts from yourprofile"]')).toBeHidden();
  await expect(page.locator('[aria-label="Suggested for you"]')).toBeHidden();
});

test('linkedin userscript: the home feed bounces to Messages with no native side', async ({ page }) => {
  await openFixture(page, 'linkedin', 'www.linkedin.com', '/', LINKEDIN_ROUTES);
  await page.waitForURL('https://www.linkedin.com/messaging/');
  await expect(page.locator('main.messaging-thread')).toBeVisible();
});

test('linkedin userscript: messaging fixture matches the in app results', async ({ page }) => {
  await openFixture(page, 'linkedin', 'www.linkedin.com', '/messaging/', LINKEDIN_ROUTES);
  await expect(page.locator('header[role="banner"]')).toBeVisible();
  await expect(page.locator('a[href="/feed/"]')).toBeHidden();
  await expect(page.locator('.app-install-banner')).toBeHidden();
  await expect(page.getByText('Hey, are we still on for Thursday?')).toBeVisible();
  await expect(page.locator('main.messaging-thread')).toBeVisible();
});

test('linkedin userscript: search fixture hides posts, keeps people', async ({ page }) => {
  await openFixture(
    page,
    'linkedin',
    'www.linkedin.com',
    '/search/results/people/?keywords=ada',
    LINKEDIN_ROUTES,
  );
  await expect(page.locator('.search-filter-chips button', { hasText: 'Posts' })).toBeHidden();
  await expect(page.locator('.search-filter-chips button', { hasText: 'People' })).toBeVisible();
  await expect(page.locator('section.search-results__posts')).toBeHidden();
  await expect(page.locator('section.search-results__people')).toBeVisible();
});

test('linkedin userscript: profile fixture hides suggestions and keeps Activity', async ({ page }) => {
  await openFixture(page, 'linkedin', 'www.linkedin.com', '/in/someone/', LINKEDIN_ROUTES);
  await expect(page.locator('section.profile-activity')).toBeVisible();
  await expect(page.locator('section.profile-suggestions')).toBeHidden();
  await expect(page.locator('h1.profile-name')).toBeVisible();
  // hideCounts defaults to off, same as the app's default.
  await expect(page.locator('.connection-count')).toBeVisible();
});
