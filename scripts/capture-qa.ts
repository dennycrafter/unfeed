// QA evidence capture for T6: the built userscripts running on the fixture
// pages, captured at 390x844. Before = page without the userscript (feed and
// site chrome visible), after = same page with the userscript (hidden).
// Writes to /tmp/unfeed-qa/*.png; uploaded via obvious autobuild upload.

import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitUserScript } from '../src/userscript/header';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');
const OUT = '/tmp/unfeed-qa';

const body = (site: 'instagram' | 'linkedin'): string =>
  splitUserScript(readFileSync(join(process.cwd(), 'userscripts', `unfeed-${site}.user.js`), 'utf8')).body;

interface Shot {
  site: 'instagram' | 'linkedin';
  host: string;
  path: string;
  fixture: string;
  file: string;
}

const SHOTS: Shot[] = [
  {
    site: 'instagram',
    host: 'www.instagram.com',
    path: '/explore/search/',
    fixture: 'instagram-search.html',
    file: 't6-userscript-instagram-search',
  },
  {
    site: 'linkedin',
    host: 'www.linkedin.com',
    path: '/messaging/',
    fixture: 'linkedin-messaging.html',
    file: 't6-userscript-linkedin-messaging',
  },
];

async function serve(page: Page, shot: Shot): Promise<void> {
  await page.route(`https://${shot.host}/**`, (route) => {
    return route.fulfill({ path: join(FIXTURES, shot.fixture), contentType: 'text/html' });
  });
}

async function shoot(browser: Browser, shot: Shot, withScript: boolean): Promise<void> {
  // 720 on the shorter edge, the repo's QA evidence size (autobuild-qa rule:
  // never upscale or pad). Phone width 390 stays for the screen tests.
  const context = await browser.newContext({ viewport: { width: 720, height: 844 } });
  const page = await context.newPage();
  if (withScript) await page.addInitScript(body(shot.site));
  await serve(page, shot);
  await page.goto(`https://${shot.host}${shot.path}`);
  await page.waitForTimeout(700);
  const suffix = withScript ? 'after' : 'before';
  await page.screenshot({ path: join(OUT, `${shot.file}-${suffix}.png`) });
  await context.close();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    await shoot(browser, shot, false);
    await shoot(browser, shot, true);
  }
  await browser.close();
  console.log(`wrote screenshots to ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
