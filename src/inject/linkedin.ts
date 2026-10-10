// LinkedIn injected script entry (charter sections 8.4 and 8.5): hide CSS,
// structural sweeps for text-only targets, unread watching and in-page rule
// enforcement, all driven by the shared rules table and matcher.

import linkedinCss from './css/linkedin.css';
import { setupInject, type HideSweep } from './common';

const HIDDEN_ATTR = 'data-unfeed-hidden';

function isHidden(element: Element): boolean {
  return element.getAttribute(HIDDEN_ATTR) !== null;
}

function hide(element: Element): void {
  element.setAttribute(HIDDEN_ATTR, '');
}

function hideAllMatching(root: ParentNode, selector: string): void {
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    if (!isHidden(node)) hide(node);
  }
}

function isOnSearchPage(): boolean {
  return location.pathname.toLowerCase().startsWith('/search/results');
}

function isOnProfilePage(): boolean {
  return location.pathname.toLowerCase().startsWith('/in/');
}

/** Search pages: hide the posts filter chip, any section titled Posts and
 * the post cards themselves (they carry a stable data-urn attribute). */
const hideSearchPosts: HideSweep = () => {
  if (!isOnSearchPage()) return;
  for (const chip of document.querySelectorAll('button, a')) {
    if (isHidden(chip)) continue;
    if ((chip.textContent ?? '').trim().toLowerCase() === 'posts') hide(chip);
  }
  for (const heading of document.querySelectorAll('h1, h2, h3')) {
    if ((heading.textContent ?? '').trim().toLowerCase() === 'posts') {
      hide(heading.closest('section') ?? heading.closest('div') ?? heading);
    }
  }
  hideAllMatching(
    document,
    '[data-urn^="urn:li:share"], [data-urn^="urn:li:activity"], [data-urn^="urn:li:ugcPost"]',
  );
};

/** Profiles: hide the Activity section and the people suggestions. Their
 * headings are stable text; the section around each heading goes. */
const PROFILE_HEADING_TEXTS = ['activity', 'more profiles for you', 'people you may know'];

const hideProfileSuggestions: HideSweep = () => {
  if (!isOnProfilePage()) return;
  for (const heading of document.querySelectorAll('h1, h2, h3')) {
    if (isHidden(heading)) continue;
    const text = (heading.textContent ?? '').trim().toLowerCase();
    if (!PROFILE_HEADING_TEXTS.includes(text)) continue;
    hide(heading.closest('section') ?? heading.closest('div') ?? heading);
  }
};

/** Hides the smallest ancestor container that carries only the target, so a
 * banner or upsell disappears without taking the page with it. */
function hideTightContainer(trigger: Element): void {
  let node: Element | null = trigger;
  for (let hop = 0; node !== null && hop < 5; hop += 1) {
    const parent: Element | null = node.parentElement;
    node = parent;
    if (node === null) break;
    if ((node.textContent ?? '').trim().length <= 160) {
      hide(node);
      return;
    }
  }
  hide(trigger);
}

const OPEN_APP_PATTERN = /open (in |the )?app|get the app/i;

/** Banners and upsells: open in app promotions and Try Premium links. */
const hideBannersAndUpsells: HideSweep = () => {
  for (const banner of document.querySelectorAll('[role="banner"]')) {
    if (!isHidden(banner) && OPEN_APP_PATTERN.test(banner.textContent ?? '')) hide(banner);
  }
  for (const trigger of document.querySelectorAll('a, button')) {
    if (isHidden(trigger)) continue;
    const text = (trigger.textContent ?? '').trim();
    if (OPEN_APP_PATTERN.test(text)) {
      hideTightContainer(trigger);
      continue;
    }
    const href = trigger.getAttribute('href') ?? '';
    if (href.startsWith('/premium/')) hideTightContainer(trigger);
  }
};

/** Counts (charter section 8.4, hideCounts setting): only leaf elements
 * whose whole text is a count, so the profile headline survives. */
const COUNT_PATTERN = /^\d[\d,]*(\.\d+)?\+?\s*(followers|connections)$/i;

const hideCountTexts: HideSweep = (settings) => {
  if (!settings.hideCounts) return;
  for (const element of document.querySelectorAll('span, div, p')) {
    if (isHidden(element) || element.children.length > 0) continue;
    if (COUNT_PATTERN.test((element.textContent ?? '').trim())) hide(element);
  }
};

setupInject('linkedin', {
  css: linkedinCss,
  sweeps: [hideSearchPosts, hideProfileSuggestions, hideBannersAndUpsells, hideCountTexts],
  unread: true,
  enforce: true,
});
