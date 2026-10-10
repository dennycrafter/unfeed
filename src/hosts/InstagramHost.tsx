// Instagram host: one persistent WebView opened straight on the DM inbox
// (charter sections 4 and 9 T1).

import type { StyleProp, ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import { INSTAGRAM_INJECT_SCRIPT } from '../inject/generated/instagram.generated';
import type { DecideSettings } from '../rules/decide';
import { WebViewHost } from './WebViewHost';

export const INSTAGRAM_HOME_URL = 'https://www.instagram.com/direct/inbox/';

interface InstagramHostProps {
  context: string;
  settings: DecideSettings;
  onMessage?: (message: PageMessage) => void;
  style?: StyleProp<ViewStyle>;
}

export function InstagramHost({ context, settings, onMessage, style }: InstagramHostProps) {
  return (
    <WebViewHost
      site="instagram"
      url={INSTAGRAM_HOME_URL}
      context={context}
      settings={settings}
      injectScript={INSTAGRAM_INJECT_SCRIPT}
      onMessage={onMessage}
      style={style}
      placeholderLabel="Instagram DMs (web preview)"
    />
  );
}
