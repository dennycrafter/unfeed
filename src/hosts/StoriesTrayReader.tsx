// The hidden stories tray reader (Denis, 25 Oct 2026). Instagram keeps the
// stories tray only on its home page, next to the feed. This loads home in a
// second web view that is never on screen: it sits under the opaque native
// stories screen, takes no touches, is hidden from screen readers, and the
// page itself is fully invisible (rule ig-home-feed). The injected script
// reads the tray and posts it back (ig-stories), and native draws its own
// circles. Logins are shared with the visible web view.

import { StyleSheet, View } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import { INSTAGRAM_INJECT_SCRIPT } from '../inject/generated/instagram.generated';
import { INSTAGRAM_ROOT_URL } from './InstagramHost';
import type { HostSettings } from './types';
import { WebViewHost } from './WebViewHost';

/** The tab context that alone lets Instagram home load (rule ig-4-home-stories-tray). */
export const STORIES_TRAY_CONTEXT = 'stories-tray';

interface StoriesTrayReaderProps {
  settings: HostSettings;
  onMessage: (message: PageMessage) => void;
}

export function StoriesTrayReader({ settings, onMessage }: StoriesTrayReaderProps) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="stories-tray-reader"
    >
      <WebViewHost
        site="instagram"
        url={INSTAGRAM_ROOT_URL}
        context={STORIES_TRAY_CONTEXT}
        settings={settings}
        hideCounts={false}
        injectScript={INSTAGRAM_INJECT_SCRIPT}
        onMessage={onMessage}
        placeholderLabel="Hidden stories tray reader"
      />
    </View>
  );
}
