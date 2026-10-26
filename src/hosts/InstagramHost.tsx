// Instagram host: one web view for one of the app's own Instagram tabs. The
// shell keeps one per opened tab (Denis, 26 Oct 2026), so a tab keeps its page
// and scroll while another one is showing.

import { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import { INSTAGRAM_INJECT_SCRIPT } from '../inject/generated/instagram.generated';
import type { HostSettings, WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const INSTAGRAM_HOME_URL = 'https://www.instagram.com/direct/inbox/';
export const INSTAGRAM_ROOT_URL = 'https://www.instagram.com/';
/** The web sign out route. Visiting it ends the session; Expo Go has no per
 * site cookie API (charter 8.8, see ASSUMPTIONS). */
export const INSTAGRAM_LOGOUT_URL = 'https://www.instagram.com/accounts/logout/';

export type { WebViewHostApi as InstagramHostHandle };

interface InstagramHostProps {
  /** Full URL to show right now; the shell owns the tab to URL mapping. */
  url: string;
  /** Native tab context: search, dms, activity or profile. */
  context: string;
  /** The tab's own start page, where a home redirect returns to. */
  homeUrl?: string | null;
  settings: HostSettings;
  onMessage?: (message: PageMessage) => void;
  /** Bump to scroll the page to the top (active tab re-press). */
  scrollToTopSignal?: number;
  style?: StyleProp<ViewStyle>;
}

export const InstagramHost = forwardRef<WebViewHostApi, InstagramHostProps>(function InstagramHost(
  { url, context, homeUrl, settings, onMessage, scrollToTopSignal, style }: InstagramHostProps,
  ref,
) {
  // Web preview labels per tab, so the screenshots read like the real screens.
  const placeholderLabels: Record<string, string> = {
    search: 'Instagram search (web preview)',
    dms: 'Instagram DMs (web preview)',
    profile: 'Instagram profile (web preview)',
    activity: 'Instagram notifications (web preview)',
  };
  return (
    <WebViewHost
      ref={ref}
      site="instagram"
      url={url}
      context={context}
      homeUrl={homeUrl}
      settings={settings}
      hideCounts={settings.hideCounts ?? false}
      injectScript={INSTAGRAM_INJECT_SCRIPT}
      onMessage={onMessage}
      scrollToTopSignal={scrollToTopSignal}
      style={style}
      placeholderLabel={placeholderLabels[context] ?? 'Instagram (web preview)'}
    />
  );
});
