// The Unfeed shell (T2 + T3): dark header with the app switcher pill and both
// hosts kept mounted (charter section 4). Switching apps only flips which
// host is visible, so both WebViews keep their state. The Instagram side has
// the native tabs, the stories ring and the page messages (charter sections
// 8.5 and 8.6); the LinkedIn side keeps T3's own tab bar.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { Header } from '@/components/Header';
import { IconAvatar, IconChat, IconGear, IconSearch, IconStories } from '@/components/icons';
import { InstagramHost, INSTAGRAM_HOME_URL, INSTAGRAM_ROOT_URL, type InstagramHostHandle } from '@/hosts/InstagramHost';
import { LinkedInHost } from '@/hosts/LinkedInHost';
import type { PageMessage } from '@/inject/protocol';
import { DEFAULT_SETTINGS } from '@/state/settings';
import { colors } from '@/theme/tokens';

type InstagramTab = 'search' | 'dms' | 'profile';

const DEFAULT_TAB: InstagramTab = 'dms';

const TAB_DEFAULT_URLS: Record<InstagramTab, string> = {
  search: 'https://www.instagram.com/explore/search/',
  dms: INSTAGRAM_HOME_URL,
  // Until the username is detected, the profile tab opens account settings.
  profile: 'https://www.instagram.com/accounts/edit/',
};

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
  const [activeApp, setActiveApp] = useState<AppKey>('instagram');
  const [activeTab, setActiveTab] = useState<InstagramTab>(DEFAULT_TAB);
  const [stories, setStories] = useState<StoriesSession | null>(null);
  const [tabUrls, setTabUrls] = useState<Record<InstagramTab, string>>(TAB_DEFAULT_URLS);
  const [username, setUsername] = useState<string | null>(null);
  const [unread, setUnread] = useState<{ instagram: number; linkedin: number }>({ instagram: 0, linkedin: 0 });
  const [scrollSignal, setScrollSignal] = useState(0);
  const hostRef = useRef<InstagramHostHandle | null>(null);

  // Switching apps only flips which host is showing; each WebView keeps its
  // state (charter section 4). Settings persistence and dots arrive in T5.
  const handleSelectApp = useCallback((app: AppKey) => {
    setActiveApp(app);
  }, []);

  const selectTab = useCallback(
    (tab: InstagramTab) => {
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
      setActiveTab(tab);
    },
    [activeTab, stories],
  );

  const openStories = useCallback(() => {
    setStories((current) => current ?? { origin: activeTab, seenStory: false });
  }, [activeTab]);

  const handleMessage = useCallback(
    (message: PageMessage) => {
      if (message.type === 'unread') {
        setUnread((prev) => (prev.instagram === message.count ? prev : { ...prev, instagram: message.count }));
        return;
      }
      if (message.type === 'ig-username') {
        const value = message.value;
        setUsername(value);
        setTabUrls((prev) => ({ ...prev, profile: `https://www.instagram.com/${value}/` }));
        return;
      }
      if (message.type !== 'route') return;
      const path = pathOf(message.url);
      if (!path) return;
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
    [activeTab, stories],
  );

  // Android back button (section 8.6): WebView back, then the default tab,
  // then leave the app. The handler logic lives in a ref so the subscription
  // happens once with always fresh logic.
  const backHandlerRef = useRef<() => boolean>(() => false);
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
      <View style={[styles.hostArea, activeApp !== 'instagram' && styles.hidden]}>
        <InstagramHost
          ref={hostRef}
          url={stories ? INSTAGRAM_ROOT_URL : tabUrls[activeTab]}
          context={stories ? 'stories' : activeTab}
          settings={DEFAULT_SETTINGS}
          onMessage={handleMessage}
          scrollToTopSignal={scrollSignal}
        />
        <BottomBar tabs={INSTAGRAM_TABS} active={activeTab} onSelect={selectTab} />
      </View>
      <View style={[styles.hostArea, activeApp !== 'linkedin' && styles.hidden]}>
        {/* QR screen, profile link saving and settings wiring land in T4/T5. */}
        <LinkedInHost settings={DEFAULT_SETTINGS} />
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
