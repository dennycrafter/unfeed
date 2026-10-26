// LinkedIn host, steered by the app's own tab bar (Denis, 25 Oct 2026):
// Profile, Messages, Search, Post, Notifications. LinkedIn's own bars are
// hidden by the inject script. Each tab has its own web view (Denis, 26 Oct
// 2026), made the first time the tab opens and then kept, so a tab comes back
// where it was left, scroll included, and never reloads by itself. Post opens
// LinkedIn's composer in a web view of its own over the tab; Search has a
// native search box with recent searches over the results page. QR lives in
// the top bar.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomBar, type BottomTab } from '../components/BottomBar';
import { EmptyState } from '../components/EmptyState';
import { IconAvatar, IconBell, IconChat, IconPlus, IconSearch } from '../components/icons';
import { SearchBar } from '../components/SearchBar';
import type { PageMessage } from '../inject/protocol';
import { LINKEDIN_INJECT_SCRIPT } from '../inject/generated/linkedin.generated';
import { buildPeopleSearchUrl, extractVanityFromUrl, isLinkedInUrl } from './linkedinUrl';
import type { DecideSettings } from '../rules/decide';
import { QrScreen } from '../qr/QrScreen';
import { tickHaptic } from '../state/haptics';
import { loadRecentSearches, nextRecentSearches, saveRecentSearches } from '../state/recentSearches';
import { colors } from '../theme/tokens';
import type { WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const LINKEDIN_MESSENGER_URL = 'https://www.linkedin.com/messaging/';
export const LINKEDIN_PROFILE_ME_URL = 'https://www.linkedin.com/in/me/';
export const LINKEDIN_NOTIFICATIONS_URL = 'https://www.linkedin.com/notifications/';
/** The mobile web sign out route. Navigating here signs the session out;
 * Expo Go has no per site cookie API (charter 8.8, see ASSUMPTIONS). */
export const LINKEDIN_LOGOUT_URL = 'https://www.linkedin.com/m/logout/';
/** LinkedIn's own post composer (rule li-8-composer). */
export const LINKEDIN_COMPOSER_URL = 'https://www.linkedin.com/feed/?shareActive=true';

export type LinkedInTab = 'profile' | 'messages' | 'search' | 'notifications';
type LinkedInBarKey = LinkedInTab | 'post';

const DEFAULT_TAB: LinkedInTab = 'messages';

const TABS: BottomTab<LinkedInBarKey>[] = [
  { key: 'profile', label: 'Profile', icon: (color) => <IconAvatar color={color} /> },
  { key: 'messages', label: 'Messages', icon: (color) => <IconChat color={color} /> },
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'post', label: 'Post', icon: (color) => <IconPlus color={color} /> },
  { key: 'notifications', label: 'Notifications', icon: (color) => <IconBell color={color} /> },
];

const TAB_ORDER: LinkedInTab[] = ['profile', 'messages', 'search', 'notifications'];

/** Opened tabs and the address each started on. The Search tab has no page
 * until the first search. */
type OpenedTabs = Partial<Record<LinkedInTab, string>>;

function startUrl(tab: LinkedInTab, profileUrl: string | null | undefined): string | null {
  switch (tab) {
    case 'profile':
      return profileUrl || LINKEDIN_PROFILE_ME_URL;
    case 'notifications':
      return LINKEDIN_NOTIFICATIONS_URL;
    case 'search':
      return null;
    default:
      return LINKEDIN_MESSENGER_URL;
  }
}

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
  /** A pasted LinkedIn link to open; the id makes the same link open twice. */
  openRequest?: { url: string; id: number } | null;
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
  openRequest = null,
  onMessage,
  style,
}: LinkedInHostProps) {
  const hostRefs = useRef<Partial<Record<LinkedInTab, WebViewHostApi | null>>>({});
  const [activeTab, setActiveTab] = useState<LinkedInTab>(DEFAULT_TAB);
  const [opened, setOpened] = useState<OpenedTabs>(() => ({ [DEFAULT_TAB]: LINKEDIN_MESSENGER_URL }));
  const [recents, setRecents] = useState<string[]>([]);
  // Post composer (Denis, 23 Oct 2026): its own web view over the tab, gone
  // again once LinkedIn closes the composer.
  const [composerOpen, setComposerOpen] = useState(false);

  const stateRef = useRef({ activeTab, qrOpen });
  useEffect(() => {
    stateRef.current = { activeTab, qrOpen };
  }, [activeTab, qrOpen]);

  useEffect(() => {
    let alive = true;
    void loadRecentSearches().then((saved) => {
      if (alive) setRecents(saved);
    });
    return () => {
      alive = false;
    };
  }, []);

  const openedRef = useRef(opened);
  useLayoutEffect(() => {
    openedRef.current = opened;
  }, [opened]);

  /** Opens a tab, making its web view the first time. With an address, the
   * tab's page moves there. */
  const showTab = useCallback(
    (tab: LinkedInTab, url?: string): void => {
      const existing = openedRef.current[tab];
      if (existing && url) hostRefs.current[tab]?.open(url);
      if (!existing) {
        const start = url ?? startUrl(tab, profileUrl);
        if (start) setOpened((current) => ({ ...current, [tab]: start }));
      }
      setActiveTab(tab);
    },
    [profileUrl],
  );

  /** Opens an address in the tab that is showing (a pasted or scanned link).
   * The Search tab before its first search has no page: Messages takes it. */
  const openInTab = useCallback(
    (target: string): void => {
      setComposerOpen(false);
      const tab = stateRef.current.activeTab;
      const host = hostRefs.current[tab];
      if (host) {
        host.open(target);
        return;
      }
      showTab('messages', target);
    },
    [showTab],
  );

  // Log out (settings screen request): Messages lands on the site's own
  // logout page and the other tabs close, then the inbox comes back so the
  // login shows. The signal id is remembered so one request runs once.
  const lastLogoutRef = useRef(0);
  useEffect(() => {
    if (logoutSignal === 0 || logoutSignal === lastLogoutRef.current) return;
    lastLogoutRef.current = logoutSignal;
    onQrOpenChange?.(false);
    setComposerOpen(false);
    setActiveTab(DEFAULT_TAB);
    setOpened({ [DEFAULT_TAB]: LINKEDIN_MESSENGER_URL });
    hostRefs.current.messages?.clearCache();
    hostRefs.current.messages?.open(LINKEDIN_LOGOUT_URL);
    const timer = setTimeout(() => hostRefs.current.messages?.open(LINKEDIN_MESSENGER_URL), 2500);
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

  const handleComposerMessage = useCallback(
    (message: PageMessage): void => {
      // The composer closed or moved on: back to the tab underneath.
      if (message.type === 'li-composer' && !message.open) setComposerOpen(false);
      handleMessage(message);
    },
    [handleMessage],
  );

  const startPost = useCallback((): void => {
    tickHaptic(haptics);
    onQrOpenChange?.(false);
    setComposerOpen(true);
  }, [haptics, onQrOpenChange]);

  const selectTab = useCallback(
    (key: LinkedInBarKey): void => {
      if (key === 'post') {
        startPost();
        return;
      }
      onQrOpenChange?.(false);
      setComposerOpen(false);
      if (key === stateRef.current.activeTab) {
        // The active tab pressed again scrolls its page to the top.
        hostRefs.current[key]?.scrollTop();
        return;
      }
      tickHaptic(haptics);
      if (key === 'profile' && !profileUrl) expectOwnVanityRef.current = true;
      showTab(key);
    },
    [haptics, onQrOpenChange, profileUrl, showTab, startPost],
  );

  const handleSearchSubmit = useCallback(
    (keywords: string): void => {
      showTab('search', buildPeopleSearchUrl(keywords));
      setRecents((current) => {
        const next = nextRecentSearches(current, keywords);
        void saveRecentSearches(next);
        return next;
      });
    },
    [showTab],
  );

  // A pasted LinkedIn link (from the Link pop-up on Instagram).
  const lastOpenRef = useRef(0);
  useEffect(() => {
    if (!openRequest || openRequest.id === lastOpenRef.current) return;
    lastOpenRef.current = openRequest.id;
    onQrOpenChange?.(false);
    openInTab(openRequest.url);
  }, [onQrOpenChange, openInTab, openRequest]);

  // Scanned LinkedIn codes (charter 8.7) open in the tab that is showing.
  const openScannedLinkedInUrl = useCallback(
    (scanned: string): void => {
      onQrOpenChange?.(false);
      openInTab(scanned);
    },
    [onQrOpenChange, openInTab],
  );

  const findMyProfile = useCallback((): void => {
    expectOwnVanityRef.current = true;
    returnToQrRef.current = true;
    onQrOpenChange?.(false);
    showTab('profile', LINKEDIN_PROFILE_ME_URL);
  }, [onQrOpenChange, showTab]);

  // Android back: close the QR panel, then the composer, then back in the
  // tab's page, then the Messages tab, then leave.
  const composerRef = useRef(composerOpen);
  useLayoutEffect(() => {
    composerRef.current = composerOpen;
  }, [composerOpen]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stateRef.current.qrOpen) {
        onQrOpenChange?.(false);
        return true;
      }
      if (composerRef.current) {
        setComposerOpen(false);
        return true;
      }
      const host = hostRefs.current[stateRef.current.activeTab];
      if (host?.canGoBack()) {
        host.goBack();
        return true;
      }
      if (stateRef.current.activeTab !== DEFAULT_TAB) {
        setActiveTab(DEFAULT_TAB);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [onQrOpenChange]);

  // Stable ref setters, one per tab.
  const refFor = useMemo(() => {
    const setters = {} as Record<LinkedInTab, (handle: WebViewHostApi | null) => void>;
    for (const tab of TAB_ORDER) {
      setters[tab] = (handle) => {
        hostRefs.current[tab] = handle;
      };
    }
    return setters;
  }, []);

  const searchIdle = activeTab === 'search' && !opened.search;

  return (
    <View style={[styles.fill, style]}>
      {activeTab === 'search' && !composerOpen ? <SearchBar recents={recents} onSubmit={handleSearchSubmit} /> : null}
      <View style={styles.fill}>
        {TAB_ORDER.map((tab) => {
          const url = opened[tab];
          if (!url) return null;
          return (
            <View key={tab} style={[styles.cover, tab !== activeTab && styles.hidden]} testID={`li-tab-${tab}`}>
              <WebViewHost
                ref={refFor[tab]}
                site="linkedin"
                url={url}
                context="page"
                homeUrl={startUrl(tab, profileUrl) ?? LINKEDIN_MESSENGER_URL}
                settings={settings}
                hideCounts={hideCounts}
                injectScript={LINKEDIN_INJECT_SCRIPT}
                onMessage={handleMessage}
                placeholderLabel={`LinkedIn ${tab} (web preview)`}
              />
            </View>
          );
        })}
        {searchIdle ? (
          <View style={styles.cover}>
            <EmptyState message="Search for people by name. Posts never show here." />
          </View>
        ) : null}
        {composerOpen ? (
          <View style={styles.cover} testID="li-composer">
            <WebViewHost
              site="linkedin"
              url={LINKEDIN_COMPOSER_URL}
              context="composer"
              settings={settings}
              hideCounts={hideCounts}
              injectScript={LINKEDIN_INJECT_SCRIPT}
              onMessage={handleComposerMessage}
              placeholderLabel="LinkedIn post (web preview)"
            />
          </View>
        ) : null}
        {qrOpen ? (
          <View style={styles.cover}>
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
      <BottomBar<LinkedInBarKey> tabs={TABS} active={activeTab} onSelect={selectTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
  hidden: { display: 'none' },
});
