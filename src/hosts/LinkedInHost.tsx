// LinkedIn host: one persistent WebView that shows LinkedIn's own top and
// bottom bars (Home and the feed hidden by the inject script), plus the QR
// panel the header button opens. Denis chose LinkedIn's bars over native tabs
// on 15 Oct 2026, so this host no longer draws a bottom bar of its own.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { PageMessage } from '../inject/protocol';
import { LINKEDIN_INJECT_SCRIPT } from '../inject/generated/linkedin.generated';
import { extractVanityFromUrl, isLinkedInUrl } from './linkedinUrl';
import type { DecideSettings } from '../rules/decide';
import { QrScreen } from '../qr/QrScreen';
import { colors } from '../theme/tokens';
import type { WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const LINKEDIN_MESSENGER_URL = 'https://www.linkedin.com/messaging/';
export const LINKEDIN_PROFILE_ME_URL = 'https://www.linkedin.com/in/me/';
/** The mobile web sign out route. Navigating here signs the session out;
 * Expo Go has no per site cookie API (charter 8.8, see ASSUMPTIONS). */
export const LINKEDIN_LOGOUT_URL = 'https://www.linkedin.com/m/logout/';

export interface LinkedInHostProps {
  settings: DecideSettings;
  hideCounts?: boolean;
  haptics?: boolean;
  /** Saved profile URL from settings, shown as My code. */
  profileUrl?: string | null;
  /** Bump to sign the session out: load the logout page, then back to
   * Messages, where the site shows its login (settings screen request). */
  logoutSignal?: number;
  /** Whether the QR panel covers the page; the header button owns it. */
  qrOpen?: boolean;
  onQrOpenChange?: (open: boolean) => void;
  /** Fires with Denis's own profile URL once the page reveals it. */
  onProfileVanityDetected?: (profileUrl: string) => void;
  /** Opens a scanned Instagram link in the Instagram app (charter 8.7). */
  onOpenInstagramUrl?: (url: string) => void;
  /** Opens the settings screen, where the profile link can be typed in. */
  onOpenSettings?: () => void;
  onMessage?: (message: PageMessage) => void;
  style?: StyleProp<ViewStyle>;
}

export function LinkedInHost({
  settings,
  hideCounts = false,
  haptics = true,
  profileUrl,
  logoutSignal = 0,
  qrOpen = false,
  onQrOpenChange,
  onProfileVanityDetected,
  onOpenInstagramUrl,
  onOpenSettings,
  onMessage,
  style,
}: LinkedInHostProps) {
  const hostRef = useRef<WebViewHostApi | null>(null);
  const [url, setUrl] = useState(LINKEDIN_MESSENGER_URL);
  const urlRef = useRef(url);
  const qrOpenRef = useRef(qrOpen);
  useEffect(() => {
    urlRef.current = url;
    qrOpenRef.current = qrOpen;
  }, [qrOpen, url]);

  /** Moves the WebView. The same URL twice would not reload through the
   * source prop, so a repeat goes through the page instead. */
  const navigate = useCallback((target: string): void => {
    if (target === urlRef.current) {
      hostRef.current?.runScript(`window.location.assign(${JSON.stringify(target)})`);
      return;
    }
    setUrl(target);
  }, []);

  // Log out (settings screen request): land on the site's own logout page,
  // then bring the inbox URL back so the login shows. The signal id is
  // remembered so one request only ever runs once.
  const lastLogoutRef = useRef(0);
  useEffect(() => {
    if (logoutSignal === 0 || logoutSignal === lastLogoutRef.current) return;
    lastLogoutRef.current = logoutSignal;
    onQrOpenChange?.(false);
    hostRef.current?.clearCache();
    setUrl(LINKEDIN_LOGOUT_URL);
    const timer = setTimeout(() => setUrl(LINKEDIN_MESSENGER_URL), 2500);
    return () => clearTimeout(timer);
  }, [logoutSignal, onQrOpenChange]);

  // Find my profile (QR empty state): load /in/me/ and reopen the QR panel
  // once the page reveals the own profile link.
  const returnToQrRef = useRef(false);
  const expectOwnVanityRef = useRef(false);

  const saveOwnProfile = useCallback(
    (ownUrl: string): void => {
      expectOwnVanityRef.current = false;
      onProfileVanityDetected?.(ownUrl);
      if (returnToQrRef.current) {
        returnToQrRef.current = false;
        onQrOpenChange?.(true);
      }
    },
    [onProfileVanityDetected, onQrOpenChange],
  );

  const handleMessage = useCallback(
    (message: PageMessage): void => {
      if (message.type === 'li-own-profile') {
        // Only the own profile carries edit links, so this is always Denis.
        saveOwnProfile(message.url);
      } else if (message.type === 'route' && isLinkedInUrl(message.url)) {
        const vanity = extractVanityFromUrl(message.url);
        const isSelf = message.url.includes('isSelfProfile=true');
        if (vanity && (expectOwnVanityRef.current || isSelf)) {
          saveOwnProfile(`https://www.linkedin.com/in/${vanity}/`);
        }
      }
      onMessage?.(message);
    },
    [onMessage, saveOwnProfile],
  );

  // Scanned LinkedIn codes (charter 8.7) open in the page behind the panel.
  const openScannedLinkedInUrl = useCallback(
    (scanned: string): void => {
      onQrOpenChange?.(false);
      navigate(scanned);
    },
    [navigate, onQrOpenChange],
  );

  const findMyProfile = useCallback((): void => {
    expectOwnVanityRef.current = true;
    returnToQrRef.current = true;
    onQrOpenChange?.(false);
    navigate(LINKEDIN_PROFILE_ME_URL);
  }, [navigate, onQrOpenChange]);

  // Android back: close the QR panel, then back in the page, then leave.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (qrOpenRef.current) {
        onQrOpenChange?.(false);
        return true;
      }
      if (hostRef.current?.canGoBack()) {
        hostRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [onQrOpenChange]);

  return (
    <View style={[styles.fill, style]}>
      <WebViewHost
        ref={hostRef}
        site="linkedin"
        url={url}
        context="page"
        settings={settings}
        hideCounts={hideCounts}
        injectScript={LINKEDIN_INJECT_SCRIPT}
        onMessage={handleMessage}
        placeholderLabel="LinkedIn (web preview)"
      />
      {qrOpen ? (
        <View style={styles.qrPanel}>
          <QrScreen
            profileUrl={profileUrl ?? null}
            haptics={haptics}
            onOpenLinkedInUrl={openScannedLinkedInUrl}
            onOpenInstagramUrl={(scanned) => onOpenInstagramUrl?.(scanned)}
            onFindProfile={findMyProfile}
            onOpenSettings={onOpenSettings}
            onClose={() => onQrOpenChange?.(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  qrPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
});
