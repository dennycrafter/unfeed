// The Unfeed shell (T2 + T3 + T5): dark header with the app switcher pill and
// both hosts kept mounted (charter section 4). Switching apps only flips which
// host is visible, so both WebViews keep their state. Settings load from the
// shared store (T5): lastApp picks the app on launch, and every toggle flows
// into both hosts, so the route guard and the injected page scripts act on
// the real settings instead of the defaults.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { Header } from '@/components/Header';
import { IconAvatar, IconChat, IconGear, IconSearch, IconStories } from '@/components/icons';
import { InstagramHost, INSTAGRAM_HOME_URL, INSTAGRAM_LOGOUT_URL, INSTAGRAM_ROOT_URL, type InstagramHostHandle } from '@/hosts/InstagramHost';
import { LinkedInHost } from '@/hosts/LinkedInHost';
import type { PageMessage } from '@/inject/protocol';
import { tickHaptic } from '@/state/haptics';
import { getStoreState, updateSettings, useStoreState } from '@/state/store';
import { colors } from '@/theme/tokens';

type InstagramTab = 'search' | 'dms' | 'profile';

const DEFAULT_TAB: InstagramTab = 'dms';

const TAB_DEFAULT_URLS: Record<InstagramTab, string> = {
  search: 'https://www.instagram.com/explore/search/',
  dms: INSTAGRAM_HOME_URL,
  // Until the username is known, the profile tab opens account settings.
  profile: 'https://www.instagram.com/accounts/edit/',
};

function initialTabUrls(): Record<InstagramTab, string> {
  const username = getStoreState().settings.igUsername;
  return {
    ...TAB_DEFAULT_URLS,
    profile: username ? `https://www.instagram.com/${username}/` : TAB_DEFAULT_URLS.profile,
  };
}

function initialUnread(): { instagram: number; linkedin: number } {
  // Web preview only: seed the unread dots from the URL so the screen tests
  // can capture the switcher with badges. Real counts arrive in page messages
  // (section 8.5), which the web placeholders never post.
  if (Platform.OS !== 'web') return { instagram: 0, linkedin: 0 };
  const params = new URLSearchParams(window.location.search);
  const instagram = Number(params.get('unreadInstagram'));
  const linkedin = Number(params.get('unreadLinkedin'));
  return {
    instagram: Number.isFinite(instagram) && instagram > 0 ? Math.floor(instagram) : 0,
    linkedin: Number.isFinite(linkedin) && linkedin > 0 ? Math.floor(linkedin) : 0,
  };
}

const INSTAGRAM_TABS: BottomTab<InstagramTab>[] = [
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'dms', label: 'DMs', icon: (color) => <IconChat color={color} /> },
  { key: 'profile', label: 'Profile', icon: (color) => <IconAvatar color={color} /> },
];

function pathOf(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

interface StoriesSession {
  origin: InstagramTab;
  /** True once a story route was seen, so the next home route means closed. */
  seenStory: boolean;
}

function StoriesButton({ onPress, active }: { onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Stories"
      accessibilityState={{ selected: active }}
      style={styles.headerButton}
    >
      <IconStories color={active ? colors.silver : colors.muted} />
    </TouchableOpacity>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={styles.headerButton}
    >
      <IconGear color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function Index() {
  const { settings, hydrated, logout } = useStoreState();
  const [activeApp, setActiveApp] = useState<AppKey>(() => getStoreState().settings.lastApp);
  const [activeTab, setActiveTab] = useState<InstagramTab>(DEFAULT_TAB);
  const [stories, setStories] = useState<StoriesSession | null>(null);
  const [tabUrls, setTabUrls] = useState<Record<InstagramTab, string>>(initialTabUrls);
  const [unread, setUnread] = useState<{ instagram: number; linkedin: number }>(initialUnread);
  const [scrollSignal, setScrollSignal] = useState(0);
  // A scanned Instagram link (T4, charter 8.7) overrides the tab URL until a
  // bottom tab is pressed, like the stories override below.
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const hostRef = useRef<InstagramHostHandle | null>(null);

  // Stored settings arrive a moment after launch: jump to the app Denis left
  // (charter section 6, lastApp). Hosts render once hydration settles, so the
  // first app shown is the saved one and the hosts then never unmount. The
  // hydration flip is adjusted during render, React's endorsed pattern for
  // state that follows a prop.
  const [lastHydrated, setLastHydrated] = useState(false);
  if (hydrated !== lastHydrated) {
    setLastHydrated(hydrated);
    if (hydrated) setActiveApp(settings.lastApp);
  }

  // Switching apps only flips which host is showing; each WebView keeps its
  // state (charter section 4). The choice is saved so the next launch opens
  // the same app, with a light tick when haptics are on.
  const handleSelectApp = useCallback(
    (app: AppKey) => {
      if (app === getStoreState().settings.lastApp) setActiveApp(app);
      tickHaptic(getStoreState().settings.haptics);
      setActiveApp(app);
      updateSettings({ lastApp: app });
    },
    [],
  );

  const selectTab = useCallback(
    (tab: InstagramTab) => {
      setScannedUrl(null);
      if (stories) {
        // Leaving the stories tray or a story: back to the tab, its own URL.
        setStories(null);
        setActiveTab(tab);
        return;
      }
      if (tab === activeTab) {
        // Active tab pressed again scrolls the page to the top (section 8.6).
        setScrollSignal((signal) => signal + 1);
        return;
      }
      tickHaptic(settings.haptics);
      setActiveTab(tab);
    },
    [activeTab, settings.haptics, stories],
  );

  const openStories = useCallback(() => {
    setScannedUrl(null);
    setStories((current) => current ?? { origin: activeTab, seenStory: false });
  }, [activeTab]);

  // A scanned Instagram link switches apps and moves the WebView, all in the
  // sheet's event handler (charter 8.7).
  const openInstagramUrl = useCallback((url: string): void => {
    setScannedUrl(url);
    setActiveApp('instagram');
  }, []);

  // The page reported the username (section 8.5): the profile tab opens it
  // and the settings screen shows it (auto-detected, editable, charter 6).
  const handleUsernameDetected = useCallback((value: string): void => {
    const url = `https://www.instagram.com/${value}/`;
    setTabUrls((prev) => (prev.profile === url ? prev : { ...prev, profile: url }));
    if (getStoreState().settings.igUsername !== value) updateSettings({ igUsername: value });
  }, []);

  // LinkedIn reported its own profile URL (vanity detected): save it, the QR
  // My code screen and the settings screen read it from there (charter 6).
  const handleProfileVanityDetected = useCallback((profileUrl: string): void => {
    if (getStoreState().settings.liProfileUrl === profileUrl) return;
    updateSettings({ liProfileUrl: profileUrl });
  }, []);

  // Log out of Instagram (settings screen request): the WebView visits the
  // site's own logout page, then the inbox URL comes back and shows login.
  // Expo Go has no per site cookie API; the site ending the session is the
  // cookie clearing (charter 8.8, see ASSUMPTIONS). The request is consumed
  // during render (the same pattern as hydration); only the delayed restore
  // runs from the timer effect below.
  const [lastLogoutId, setLastLogoutId] = useState(0);
  if (logout && logout.site === 'instagram' && logout.id !== lastLogoutId) {
    setLastLogoutId(logout.id);
    setScannedUrl(null);
    setStories(null);
    setActiveTab(DEFAULT_TAB);
    setTabUrls((current) => ({ ...current, dms: INSTAGRAM_LOGOUT_URL }));
  }

  useEffect(() => {
    if (!logout || logout.id !== lastLogoutId) return;
    if (logout.site !== 'instagram') return;
    hostRef.current?.clearCache();
    const timer = setTimeout(() => {
      setTabUrls((current) => ({ ...current, dms: INSTAGRAM_HOME_URL }));
    }, 2500);
    return () => clearTimeout(timer);
  }, [lastLogoutId, logout]);

  const handleMessage = useCallback(
    (message: PageMessage) => {
      if (message.type === 'unread') {
        setUnread((prev) => (prev.instagram === message.count ? prev : { ...prev, instagram: message.count }));
        return;
      }
      if (message.type === 'ig-username') {
        handleUsernameDetected(message.value);
        return;
      }
      if (message.type !== 'route') return;
      const path = pathOf(message.url);
      if (!path) return;
      if (scannedUrl) {
        // Showing a scanned link (charter 8.7): tab URLs stay as they were, a
        // bottom tab press returns to them.
        return;
      }
      if (stories) {
        if (path.startsWith('/stories/')) {
          setStories((current) => (current ? { ...current, seenStory: true } : current));
          return;
        }
        if (path === '/') {
          if (stories.seenStory) {
            // The story ended or was closed: return to the origin tab (8.6).
            setStories(null);
            setActiveTab(stories.origin);
          }
          return;
        }
        // Browsing on from a story (a profile, say): restore the origin tab
        // without navigating, the page reached is allowed content.
        setStories(null);
        setActiveTab(stories.origin);
        return;
      }
      setTabUrls((prev) => (prev[activeTab] === message.url ? prev : { ...prev, [activeTab]: message.url }));
    },
    [activeTab, handleUsernameDetected, scannedUrl, stories],
  );

  // Android back button (section 8.6): WebView back, then the default tab,
  // then leave the app. The latest handler lives in a ref so the
  // subscription happens once with always fresh logic.
  const backHandlerRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    backHandlerRef.current = (): boolean => {
      if (activeApp !== 'instagram') return false;
      if (stories) {
        setStories(null);
        return true;
      }
      if (hostRef.current?.canGoBack()) {
        hostRef.current.goBack();
        return true;
      }
      if (activeTab !== DEFAULT_TAB) {
        selectTab(DEFAULT_TAB);
        return true;
      }
      return false;
    };
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => backHandlerRef.current());
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.fill}>
      <Header
        left={<StoriesButton onPress={openStories} active={stories !== null} />}
        center={<AppSwitcher active={activeApp} unread={unread} onSelect={handleSelectApp} />}
        right={<SettingsButton onPress={() => router.push('/settings')} />}
      />
      <View style={[styles.hostArea, activeApp !== 'instagram' && styles.hidden]} testID="host-instagram">
        {hydrated ? (
          <InstagramHost
            ref={hostRef}
            url={stories ? INSTAGRAM_ROOT_URL : (scannedUrl ?? tabUrls[activeTab])}
            context={stories ? 'stories' : (scannedUrl ? 'profile' : activeTab)}
            settings={settings}
            onMessage={handleMessage}
            scrollToTopSignal={scrollSignal}
          />
        ) : null}
        <BottomBar tabs={INSTAGRAM_TABS} active={activeTab} onSelect={selectTab} />
      </View>
      <View style={[styles.hostArea, activeApp !== 'linkedin' && styles.hidden]} testID="host-linkedin">
        {hydrated ? (
          <LinkedInHost
            settings={settings}
            hideCounts={settings.hideCounts}
            haptics={settings.haptics}
            profileUrl={settings.liProfileUrl}
            logoutSignal={logout?.site === 'linkedin' ? logout.id : 0}
            onProfileVanityDetected={handleProfileVanityDetected}
            onOpenInstagramUrl={openInstagramUrl}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hostArea: { flex: 1 },
  hidden: { display: 'none' },
  headerButton: { padding: 8 },
});
