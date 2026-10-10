// LinkedIn host (charter sections 8.6 and 9 T3): one persistent WebView plus
// the native bottom bar (Messages, Search, QR, Profile). Tabs move the same
// WebView to a new URL; tapping the active tab scrolls to the top; the
// Android back button goes back in the page, then to Messages, then leaves.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomBar, type BottomTab } from '../components/BottomBar';
import { EmptyState } from '../components/EmptyState';
import { IconChat, IconPerson, IconQr, IconSearch } from '../components/icons';
import { SearchBar } from '../components/SearchBar';
import type { PageMessage } from '../inject/protocol';
import { LINKEDIN_INJECT_SCRIPT } from '../inject/generated/linkedin.generated';
import { buildPeopleSearchUrl, extractVanityFromUrl, isLinkedInUrl } from './linkedinUrl';
import type { DecideSettings } from '../rules/decide';
import { loadRecentSearches, nextRecentSearches, saveRecentSearches } from '../state/recentSearches';
import { colors } from '../theme/tokens';
import type { WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const LINKEDIN_MESSENGER_URL = 'https://www.linkedin.com/messaging/';
export const LINKEDIN_PROFILE_ME_URL = 'https://www.linkedin.com/in/me/';

export type LinkedInTab = 'messages' | 'search' | 'qr' | 'profile';

export interface LinkedInHostProps {
  settings: DecideSettings;
  hideCounts?: boolean;
  haptics?: boolean;
  /** Saved profile URL from settings; used until a vanity is detected. */
  profileUrl?: string | null;
  /** Fires with the profile URL once the WebView lands on /in/<vanity>/. */
  onProfileVanityDetected?: (profileUrl: string) => void;
  onMessage?: (message: PageMessage) => void;
  style?: StyleProp<ViewStyle>;
}

export interface LinkedInHostApi {
  goTab(tab: LinkedInTab): void;
  goBack(): void;
}

const DEFAULT_TAB: LinkedInTab = 'messages';

function initialTabUrls(profileUrl: string | null | undefined): Record<LinkedInTab, string> {
  return {
    messages: LINKEDIN_MESSENGER_URL,
    search: LINKEDIN_MESSENGER_URL,
    qr: LINKEDIN_MESSENGER_URL,
    profile: profileUrl || LINKEDIN_PROFILE_ME_URL,
  };
}

export function LinkedInHost({
  settings,
  hideCounts = false,
  haptics = true,
  profileUrl,
  onProfileVanityDetected,
  onMessage,
  style,
}: LinkedInHostProps) {
  const hostRef = useRef<WebViewHostApi | null>(null);
  const [activeTab, setActiveTab] = useState<LinkedInTab>(DEFAULT_TAB);
  const [tabUrls, setTabUrls] = useState<Record<LinkedInTab, string>>(() => initialTabUrls(profileUrl));
  const [recents, setRecents] = useState<string[]>([]);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    loadRecentSearches().then((loaded) => {
      if (!cancelled) setRecents(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A new saved profile URL moves the Profile tab (settings edit or first
  // detection); the QR tab never carries a page. Adjusted during render on
  // the prop change, the React endorsed alternative to an effect.
  const [lastProfileUrl, setLastProfileUrl] = useState(profileUrl);
  if (profileUrl !== lastProfileUrl) {
    setLastProfileUrl(profileUrl);
    if (profileUrl) setTabUrls((current) => ({ ...current, profile: profileUrl }));
  }

  const tick = useCallback((): void => {
    if (!haptics) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
      console.warn('[unfeed] haptic failed', error);
    });
  }, [haptics]);

  // Tab switching never remounts the WebView: same host, new context and,
  // when the tab carries its own URL, a new source (charter section 4).
  const goTab = useCallback(
    (tab: LinkedInTab): void => {
      if (tab === activeTabRef.current) {
        hostRef.current?.scrollTop();
        return;
      }
      tick();
      setActiveTab(tab);
    },
    [tick],
  );

  const handleTabSelect = useCallback(
    (key: string): void => {
      goTab(key as LinkedInTab);
    },
    [goTab],
  );

  const handleSearchSubmit = useCallback((keywords: string): void => {
    const url = buildPeopleSearchUrl(keywords);
    setTabUrls((current) => ({ ...current, search: url }));
    setActiveTab('search');
    setRecents((current) => {
      const next = nextRecentSearches(current, keywords);
      void saveRecentSearches(next);
      return next;
    });
  }, []);

  const handleMessage = useCallback(
    (message: PageMessage): void => {
      if (message.type === 'route' && isLinkedInUrl(message.url)) {
        const vanity = extractVanityFromUrl(message.url);
        if (vanity) onProfileVanityDetected?.(`https://www.linkedin.com/in/${vanity}/`);
      }
      onMessage?.(message);
    },
    [onMessage, onProfileVanityDetected],
  );

  // Charter section 8.6: back in the page, then the default tab, then the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hostRef.current?.canGoBack()) {
        hostRef.current.goBack();
        return true;
      }
      if (activeTabRef.current !== DEFAULT_TAB) {
        setActiveTab(DEFAULT_TAB);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);

  const tabs: BottomTab[] = [
    { key: 'messages', label: 'Messages', icon: (color) => <IconChat color={color} /> },
    { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
    { key: 'qr', label: 'QR', icon: (color) => <IconQr color={color} /> },
    { key: 'profile', label: 'Profile', icon: (color) => <IconPerson color={color} /> },
  ];

  return (
    <View style={[styles.fill, style]}>
      <View style={styles.page}>
        {activeTab === 'search' ? (
          <SearchBar recents={recents} onSubmit={handleSearchSubmit} />
        ) : null}
        <WebViewHost
          ref={hostRef}
          site="linkedin"
          url={tabUrls[activeTab]}
          context={activeTab}
          settings={settings}
          hideCounts={hideCounts}
          injectScript={LINKEDIN_INJECT_SCRIPT}
          onMessage={handleMessage}
          placeholderLabel={`LinkedIn ${activeTab} (web preview)`}
        />
        {activeTab === 'qr' ? (
          <View style={styles.qrPanel}>
            {/* The scanner and My code screens land with T4 (charter 8.7). */}
            <EmptyState message="The QR scanner and your code arrive with the next update." />
          </View>
        ) : null}
      </View>
      <BottomBar tabs={tabs} active={activeTab} onSelect={handleTabSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  qrPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
});
