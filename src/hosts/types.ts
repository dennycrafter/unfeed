// Shared contract for the WebView host and its web preview stand in.

import type { StyleProp, ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import type { DecideSettings, Site } from '../rules/decide';

/** Route guard settings plus the page side toggles. The full Settings type
 * satisfies this shape. */
export type HostSettings = DecideSettings & { hideCounts?: boolean };

/** Imperative controls the shell needs for the Android back button and the
 * tab re-press scroll to top. */
export interface WebViewHostHandle {
  goBack: () => void;
  canGoBack: () => boolean;
}

export interface WebViewHostProps {
  site: Site;
  /** Full URL the host should be showing. */
  url: string;
  /** Which native tab is asking, for example dms or stories. */
  context: string;
  settings: DecideSettings;
  /** Hide like, view, follower and connection counts on the page. */
  hideCounts?: boolean;
  /** Generated inject script for this site, from src/inject/generated. */
  injectScript: string;
  /** Parsed messages from the page (route changes, unread, errors). */
  onMessage?: (message: PageMessage) => void;
  /** Bump this number to scroll the page to the top (active tab re-press). */
  scrollToTopSignal?: number;
  style?: StyleProp<ViewStyle>;
  /** Web preview only: a short label for the placeholder panel. */
  placeholderLabel?: string;
}

/** Imperative controls the native hosts need for tab behaviour (charter
 * section 8.6): scroll to top on a second tab tap, and hardware back. */
export interface WebViewHostApi {
  scrollTop(): void;
  goBack(): void;
  canGoBack(): boolean;
  /** Drops the cached page data, part of the log out flow (charter 8.8).
   * No web preview effect: there is no real cache there. */
  clearCache(): void;
  /** Runs a snippet in the page, for example the Instagram Post hook. No
   * web preview effect: there is no real page there. */
  runScript(code: string): void;
}
