// What the WebView does with one load request, given the route guard result.
// Pure so the unit tests can cover it without a native WebView.

import type { DecideResult } from '../rules/decide';

export type LoadDecision = 'load' | 'open-outside' | 'redirect';

export interface LoadRequestInfo {
  /** False for iframes (login sync, trackers, captchas). Undefined on platforms that do not report it. */
  isTopFrame?: boolean;
  /** iOS only: 'click' means the user tapped a link. Always 'other' on Android. */
  navigationType?: string;
  /** The platform this runs on, as Platform.OS reports it. */
  platform: string;
}

export function loadDecision(result: DecideResult, request: LoadRequestInfo): LoadDecision {
  // Frames inside the page are never the page itself, so they never leave the
  // app or redirect it. Sending them out made Safari open over and over.
  if (request.isTopFrame === false) return 'load';
  if (result.action === 'allow') return 'load';
  if (result.action === 'redirect') return 'redirect';
  // Outside host: only a link the user tapped goes to Safari. Automatic hops,
  // such as Instagram's login passing through facebook.com, stay in the app.
  // Android always reports 'other', so it keeps opening outside hosts outside.
  if (request.platform === 'ios' && request.navigationType !== 'click') return 'load';
  return 'open-outside';
}
