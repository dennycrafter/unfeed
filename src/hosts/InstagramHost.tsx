// Instagram host: one persistent WebView that the native tabs steer by URL
// (charter sections 4 and 8.6). Tabs move this WebView to a new URL; they
// never create a second one.

import { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import { INSTAGRAM_INJECT_SCRIPT } from '../inject/generated/instagram.generated';
import type { HostSettings, WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const INSTAGRAM_HOME_URL = 'https://www.instagram.com/direct/inbox/';
export const INSTAGRAM_ROOT_URL = 'https://www.instagram.com/';

export type { WebViewHostApi as InstagramHostHandle };

interface InstagramHostProps {
  /** Full URL to show right now; the shell owns the tab to URL mapping. */
  url: string;
  /** Native tab context: search, dms, profile or stories. */
  context: string;
  settings: HostSettings;
  onMessage?: (message: PageMessage) => void;
  /** Bump to scroll the page to the top (active tab re-press). */
  scrollToTopSignal?: number;
  style?: StyleProp<ViewStyle>;
}

export const InstagramHost = forwardRef<WebViewHostApi, InstagramHostProps>(function InstagramHost(
  { url, context, settings, onMessage, scrollToTopSignal, style }: InstagramHostProps,
  ref,
) {
  // Web preview labels per tab, so the screenshots read like the real screens.
  const placeholderLabels: Record<string, string> = {
    search: 'Instagram search (web preview)',
    dms: 'Instagram DMs (web preview)',
    profile: 'Instagram profile (web preview)',
    stories: 'Instagram stories tray (web preview)',
  };
  return (
    <WebViewHost
      ref={ref}
      site="instagram"
      url={url}
      context={context}
      settings={settings}
      injectScript={INSTAGRAM_INJECT_SCRIPT}
      onMessage={onMessage}
      scrollToTopSignal={scrollToTopSignal}
      style={style}
      placeholderLabel={placeholderLabels[context] ?? 'Instagram (web preview)'}
    />
  );
});
