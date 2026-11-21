// X in-page behaviour (Denis, 21 Nov 2026): others' timelines hidden on their
// profiles, the own profile untouched, Discover more gone under a post, X's
// own bottom bar hidden, the username reported, and home bounced in-page.

import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { X_INJECT_SCRIPT } from '../../src/inject/generated/x.generated';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');

async function open(page: Page, path: string, fixture: string): Promise<void> {
  await page.addInitScript(() => {
    const store: unknown[] = [];
    (window as unknown as { __unfeedMessages: unknown[] }).__unfeedMessages = store;
    Object.defineProperty(window, 'ReactNativeWebView', {
      value: { postMessage: (data: string) => store.push(JSON.parse(data)) },
      configurable: true,
    });
    (window as unknown as { __UNFEED_HOME__: string }).__UNFEED_HOME__ = 'https://x.com/messages';
  });
  await page.addInitScript(X_INJECT_SCRIPT);
  await page.route('https://x.com/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === path) return route.fulfill({ path: join(FIXTURES, fixture), contentType: 'text/html' });
    return route.fulfill({ body: `<!doctype html><title>${pathname}</title><p>${pathname}</p>`, contentType: 'text/html' });
  });
  await page.goto(`https://x.com${path}`);
}

test('someone else profile: who they are stays, their posts and tabs go, with a note', async ({ page }) => {
  await open(page, '/someone', 'x-profile.html');
  await expect(page.getByText('Writes about engines.')).toBeVisible();
  await expect(page.locator('#follow')).toBeVisible();
  await expect(page.locator('#timeline')).toBeHidden();
  await expect(page.locator('[role="tablist"]')).toBeHidden();
  await expect(page.getByText('Posts are hidden in Unfeed.', { exact: false })).toBeVisible();
});

test('X own bottom bar is hidden and the signed in username is reported', async ({ page }) => {
  await open(page, '/someone', 'x-profile.html');
  await expect(page.locator('[data-testid="BottomBar"]')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __unfeedMessages: Array<{ type: string; value?: string }> }).__unfeedMessages.find((m) => m.type === 'x-username')))
    .toEqual({ type: 'x-username', value: 'denis_x' });
});

test('the own profile keeps its posts', async ({ page }) => {
  await open(page, '/denis_x', 'x-own-profile.html');
  await expect(page.getByText('My own post')).toBeVisible();
  await expect(page.locator('#unfeed-x-note')).toHaveCount(0);
});

test('single post: the post and replies stay, Discover more and below go', async ({ page }) => {
  await open(page, '/someone/status/123', 'x-status.html');
  await expect(page.locator('#post')).toBeVisible();
  await expect(page.locator('#reply')).toBeVisible();
  await expect(page.locator('#discover')).toBeHidden();
  await expect(page.locator('#sourced')).toBeHidden();
  await expect(page.locator('#recommended')).toBeHidden();
});

test('a move to the home timeline goes back to the last page instead', async ({ page }) => {
  await open(page, '/someone/status/123', 'x-status.html');
  await page.evaluate(() => history.pushState(null, '', '/home'));
  await page.waitForURL('https://x.com/someone/status/123');
});
