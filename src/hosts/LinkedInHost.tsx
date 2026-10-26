// LinkedIn host: one persistent WebView steered by the app's own tab bar
// (Denis, 25 Oct 2026): Profile, Messages, Search, Post, Notifications.
// LinkedIn's own bars are hidden by the inject script. Each tab remembers the
// page it was on, so going back to a tab lands where it was left. Post is an
// action that opens LinkedIn's composer; Search has a native search box with
// recent searches over the results page. QR and Link live in the top bar.

import { useCallback, useEffect, useRef, useState } from 'react';
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

/** The Search tab has no page until the first search. */
type TabUrls = Record<LinkedInTab, string | null>;

function initialTabUrls(profileUrl: string | null | undefined): TabUrls {
  return {
    profile: profileUrl || LINKEDIN_PROFILE_ME_URL,
    messages: LINKEDIN_MESSENGER_URL,
    search: null,
    notifications: LINKEDIN_NOTIFICATIONS_URL,
  };
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
  const hostRef = useRef<WebViewHostApi | null>(null);
  const [activeTab, setActiveTab] = useState<LinkedInTab>(DEFAULT_TAB);
  const [tabUrls, setTabUrls] = useState<TabUrls>(() => initialTabUrls(profileUrl));
  // A page shown on top of the tab (composer, pasted or scanned link, log
  // out). The tab's own page comes back when a tab is pressed.
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  // Post composer session (Denis, 23 Oct 2026): the route guard lets the
  // bare /feed/ through only while LinkedIn's composer is open.
  const [composerOpen, setComposerOpen] = useState(false);
  const setComposer = useCallback((open: boolean): void => {
    hostRef.current?.setContext(open ? 'composer' : 'page');
    setComposerOpen(open);
  }, []);

  const shownUrl = pageUrl ?? tabUrls[activeTab];
  const searchIdle = activeTab === 'search' && pageUrl === null && tabUrls.search === null;
  // The WebView needs some address even while the Search tab has none yet;
  // it stays on the last page, covered by the search screen.
  const [lastShown, setLastShown] = useState(LINKEDIN_MESSENGER_URL);
  if (shownUrl && shownUrl !== lastShown) setLastShown(shownUrl);
  const webViewUrl = shownUrl ?? lastShown;

  const stateRef = useRef({ activeTab, pageUrl, composerOpen, qrOpen, webViewUrl });
  useEffect(() => {
    stateRef.current = { activeTab, pageUrl, composerOpen, qrOpen, webViewUrl };
  }, [activeTab, composerOpen, pageUrl, qrOpen, webViewUrl]);

  useEffect(() => {
    let alive = true;
    void loadRecentSearches().then((saved) => {
      if (alive) setRecents(saved);
    });
    return () => {
      alive = false;
    };
  }, []);

  // A new saved profile link moves the Profile tab (detected or typed in
  // Settings). Adjusted during render, React's pattern for state that
  // follows a prop.
  const [lastProfileUrl, setLastProfileUrl] = useState(profileUrl);
  if (profileUrl !== lastProfileUrl) {
    setLastProfileUrl(profileUrl);
    if (profileUrl) setTabUrls((current) => ({ ...current, profile: profileUrl }));
  }

  /** Shows a page over the current tab. The same address twice would not
   * reload through the source prop, so a repeat goes through the page. */
  const showPage = useCallback((target: string): void => {
    if (target === stateRef.current.webViewUrl) {
      hostRef.current?.runScript(`window.location.assign(${JSON.stringify(target)})`);
    }
    setPageUrl(target);
  }, []);

  // Log out (settings screen request): land on the site's own logout page,
  // then bring the inbox back so the login shows. The signal id is
  // remembered so one request only ever runs once.
  const lastLogoutRef = useRef(0);
  useEffect(() => {
    if (logoutSignal === 0 || logoutSignal === lastLogoutRef.current) return;
    lastLogoutRef.current = logoutSignal;
    onQrOpenChange?.(false);
    hostRef.current?.clearCache();
    setActiveTab(DEFAULT_TAB);
    setTabUrls(initialTabUrls(null));
    setPageUrl(LINKEDIN_LOGOUT_URL);
    const timer = setTimeout(() => setPageUrl(null), 2500);
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
      if (message.type === 'li-composer') {
        setComposer(message.open);
        // The composer closed: back to the tab's own page.
        if (!message.open) setPageUrl(null);
      } else if (message.type === 'route' && message.url.includes('shareActive')) {
        setComposer(true);
      }
      if (message.type === 'li-own-profile') {
        // Only the own profile carries edit links, so this is always Denis.
        saveOwnProfile(message.url);
      } else if (message.type === 'route' && isLinkedInUrl(message.url)) {
        const vanity = extractVanityFromUrl(message.url);
        const isSelf = message.url.includes('isSelfProfile=true');
        if (vanity && (expectOwnVanityRef.current || isSelf)) {
          saveOwnProfile(`https://www.linkedin.com/in/${vanity}/`);
        }
        // Each tab keeps its place: remember where the tab's page went.
        const current = stateRef.current;
        if (current.pageUrl === null && !current.composerOpen && !message.url.includes('shareActive')) {
          const tab = current.activeTab;
          setTabUrls((urls) => (urls[tab] === message.url || (tab === 'search' && urls.search === null) ? urls : { ...urls, [tab]: message.url }));
        }
      }
      onMessage?.(message);
    },
    [onMessage, saveOwnProfile, setComposer],
  );

  const startPost = useCallback((): void => {
    tickHaptic(haptics);
    onQrOpenChange?.(false);
    setComposer(true);
    showPage(LINKEDIN_COMPOSER_URL);
  }, [haptics, onQrOpenChange, setComposer, showPage]);

  const selectTab = useCallback(
    (key: LinkedInBarKey): void => {
      if (key === 'post') {
        startPost();
        return;
      }
      onQrOpenChange?.(false);
      const current = stateRef.current;
      if (key === current.activeTab && current.pageUrl === null) {
        // The active tab pressed again scrolls its page to the top.
        hostRef.current?.scrollTop();
        return;
      }
      if (current.composerOpen) setComposer(false);
      tickHaptic(haptics);
      if (key === 'profile' && !profileUrl) expectOwnVanityRef.current = true;
      setPageUrl(null);
      setActiveTab(key);
    },
    [haptics, onQrOpenChange, profileUrl, setComposer, startPost],
  );

  const handleSearchSubmit = useCallback((keywords: string): void => {
    const url = buildPeopleSearchUrl(keywords);
    setPageUrl(null);
    setActiveTab('search');
    setTabUrls((current) => ({ ...current, search: url }));
    setRecents((current) => {
      const next = nextRecentSearches(current, keywords);
      void saveRecentSearches(next);
      return next;
    });
  }, []);

  // A pasted LinkedIn link (the header Link button).
  const lastOpenRef = useRef(0);
  useEffect(() => {
    if (!openRequest || openRequest.id === lastOpenRef.current) return;
    lastOpenRef.current = openRequest.id;
    onQrOpenChange?.(false);
    showPage(openRequest.url);
  }, [onQrOpenChange, openRequest, showPage]);

  // Scanned LinkedIn codes (charter 8.7) open over the current tab.
  const openScannedLinkedInUrl = useCallback(
    (scanned: string): void => {
      onQrOpenChange?.(false);
      showPage(scanned);
    },
    [onQrOpenChange, showPage],
  );

  const findMyProfile = useCallback((): void => {
    expectOwnVanityRef.current = true;
    returnToQrRef.current = true;
    onQrOpenChange?.(false);
    setPageUrl(null);
    setActiveTab('profile');
    setTabUrls((current) => ({ ...current, profile: LINKEDIN_PROFILE_ME_URL }));
  }, [onQrOpenChange]);

  // Android back: close the QR panel, then back in the page, then the
  // Messages tab, then leave.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stateRef.current.qrOpen) {
        onQrOpenChange?.(false);
        return true;
      }
      if (hostRef.current?.canGoBack()) {
        hostRef.current.goBack();
        return true;
      }
      if (stateRef.current.activeTab !== DEFAULT_TAB) {
        setPageUrl(null);
        setActiveTab(DEFAULT_TAB);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [onQrOpenChange]);

  return (
    <View style={[styles.fill, style]}>
      {activeTab === 'search' && pageUrl === null ? (
        <SearchBar recents={recents} onSubmit={handleSearchSubmit} />
      ) : null}
      <View style={styles.fill}>
        <WebViewHost
          ref={hostRef}
          site="linkedin"
          url={webViewUrl}
          context={composerOpen ? 'composer' : 'page'}
          settings={settings}
          hideCounts={hideCounts}
          injectScript={LINKEDIN_INJECT_SCRIPT}
          onMessage={handleMessage}
          placeholderLabel={`LinkedIn ${activeTab} (web preview)`}
        />
        {searchIdle ? (
          <View style={styles.cover}>
            <EmptyState message="Search for people by name. Posts never show here." />
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
});
