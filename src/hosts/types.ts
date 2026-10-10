// Shared contract for the WebView host and its web preview stand in.

import type { StyleProp, ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import type { DecideSettings, Site } from '../rules/decide';

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
  /** Parsed messages from the page (route changes, errors). */
  onMessage?: (message: PageMessage) => void;
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
}
