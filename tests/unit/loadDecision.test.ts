// Frames inside a page and automatic hops to outside hosts must not open
// Safari; only a tapped link to an outside host leaves the app.

import { decide, type DecideSettings } from '../../src/rules/decide';
import { loadDecision } from '../../src/hosts/loadDecision';

const settings: DecideSettings = { allowSharedPosts: false };
const external = { action: 'external', rule: 'outside-host' } as const;
const allow = { action: 'allow', rule: 'test' } as const;
const redirect = { action: 'redirect', rule: 'test', to: '/direct/inbox/' } as const;

describe('loadDecision', () => {
  test('an iframe on an outside host loads in place (Instagram login sync)', () => {
    const result = decide('instagram', 'https://www.facebook.com/instagram/login_sync/', 'dms', settings);
    expect(result.action).toBe('external');
    expect(loadDecision(result, { isTopFrame: false, navigationType: 'other', platform: 'ios' })).toBe('load');
  });

  test('an iframe never redirects the page', () => {
    expect(loadDecision(redirect, { isTopFrame: false, navigationType: 'other', platform: 'ios' })).toBe('load');
  });

  test('a tapped link to an outside host opens outside on iOS', () => {
    expect(loadDecision(external, { isTopFrame: true, navigationType: 'click', platform: 'ios' })).toBe('open-outside');
  });

  test('an automatic top frame hop to an outside host stays in the app on iOS', () => {
    expect(loadDecision(external, { isTopFrame: true, navigationType: 'other', platform: 'ios' })).toBe('load');
    expect(loadDecision(external, { isTopFrame: true, navigationType: 'formsubmit', platform: 'ios' })).toBe('load');
  });

  test('Android keeps opening outside hosts outside, since it has no navigation type', () => {
    expect(loadDecision(external, { isTopFrame: true, navigationType: 'other', platform: 'android' })).toBe('open-outside');
  });

  test('allowed pages load and blocked pages redirect in the top frame', () => {
    expect(loadDecision(allow, { isTopFrame: true, navigationType: 'click', platform: 'ios' })).toBe('load');
    expect(loadDecision(redirect, { isTopFrame: true, navigationType: 'click', platform: 'ios' })).toBe('redirect');
  });

  test('a missing isTopFrame is treated as the top frame', () => {
    expect(loadDecision(external, { navigationType: 'click', platform: 'ios' })).toBe('open-outside');
  });
});
