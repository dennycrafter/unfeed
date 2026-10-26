// The Unfeed shell (T2 + T3 + T5): dark header with the app switcher pill and
// both hosts kept mounted (charter section 4). Switching apps only flips which
// host is visible, so both WebViews keep their state. Settings load from the
// shared store (T5): lastApp picks the app on launch, and every toggle flows
// into both hosts, so the route guard and the injected page scripts act on
// the real settings instead of the defaults.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { BarButton, Header } from '@/components/Header';
import { IconAvatar, IconChat, IconGear, IconLink, IconPlus, IconQr, IconSearch, IconStories } from '@/components/icons';
import { LinkSheet } from '@/components/LinkSheet';
import { StoriesTray, type StoriesStatus, type StoryCircle } from '@/components/StoriesTray';
import { Toast } from '@/components/Toast';
import { InstagramHost, INSTAGRAM_HOME_URL, INSTAGRAM_LOGOUT_URL, type InstagramHostHandle } from '@/hosts/InstagramHost';
import { LinkedInHost } from '@/hosts/LinkedInHost';
import { StoriesTrayReader } from '@/hosts/StoriesTrayReader';
import type { PageMessage } from '@/inject/protocol';
import type { PastedLink } from '@/link/pastedLink';
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
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { instagram: 0, linkedin: 0 };
  const params = new URLSearchParams(window.location.search);
  const instagram = Number(params.get('unreadInstagram'));
  const linkedin = Number(params.get('unreadLinkedin'));
  return {
    instagram: Number.isFinite(instagram) && instagram > 0 ? Math.floor(instagram) : 0,
    linkedin: Number.isFinite(linkedin) && linkedin > 0 ? Math.floor(linkedin) : 0,
  };
}

/** Post is an action, not a tab: it opens Instagram's own create flow in the
 * current page and never becomes the active item. */
type InstagramBarKey = InstagramTab | 'stories' | 'post';

/** The app's own Instagram tabs (Denis, 25 Oct 2026). Stories opens the
 * native story circles; Post is an action and never becomes active. */
const INSTAGRAM_TABS: BottomTab<InstagramBarKey>[] = [
  { key: 'stories', label: 'Stories', icon: (color) => <IconStories color={color} /> },
  { key: 'dms', label: 'DMs', icon: (color) => <IconChat color={color} /> },
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'post', label: 'Post', icon: (color) => <IconPlus color={color} /> },
  { key: 'profile', label: 'Profile', icon: (color) => <IconAvatar color={color} /> },
];

/** Calls the hook the Instagram inject script installs (src/inject/instagram.ts). */
const CREATE_SCRIPT = 'window.__UNFEED_CREATE__ && window.__UNFEED_CREATE__()';

/** Post flow: idle, waiting for the profile page after the current page had
 * no New post control, or retried there once. */
type PostAttempt = 'idle' | 'waiting' | 'retried';

function pathOf(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

/** The Stories button (Denis, 25 Oct 2026): the native stories screen shows
 * while viewing is null; tapping a circle opens that person's stories in the
 * visible web view. Instagram home never shows in it. */
interface StoriesSession {
  origin: InstagramTab;
  /** Whose stories the visible web view is playing, or null for the circles. */
  viewing: string | null;
  /** True once a story route was seen, so leaving it means the story ended. */
  seenStory: boolean;
}

/** How long the hidden reader gets before the tray counts as empty. */
const TRAY_TIMEOUT_MS = 15000;

function storyUrl(username: string): string {
  return `https://www.instagram.com/stories/${encodeURIComponent(username)}/`;
}

/** Web preview only: ?demoStories=1 seeds a few circles so the screen tests
 * can capture the stories screen. The web placeholders never post a tray. */
function initialStoryItems(): StoryCircle[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return [];
  if (new URLSearchParams(window.location.search).get('demoStories') !== '1') return [];
  return ['alice', 'bob.builds', 'cara_k', 'dan', 'eve.photo'].map((username) => ({ username, avatar: null }));
}

export default function Index() {
  const { settings, hydrated, logout } = useStoreState();
  const [activeApp, setActiveApp] = useState<AppKey>(() => getStoreState().settings.lastApp);
  const [activeTab, setActiveTab] = useState<InstagramTab>(DEFAULT_TAB);
  const [stories, setStories] = useState<StoriesSession | null>(() =>
    initialStoryItems().length > 0 ? { origin: DEFAULT_TAB, viewing: null, seenStory: false } : null,
  );
  const [storyItems, setStoryItems] = useState<StoryCircle[]>(initialStoryItems);
  const [storiesStatus, setStoriesStatus] = useState<StoriesStatus>(() =>
    initialStoryItems().length > 0 ? 'ready' : 'loading',
  );
  // Bumped on every open or retry, so the hidden reader loads home afresh.
  const [trayLoad, setTrayLoad] = useState(0);
  const [tabUrls, setTabUrls] = useState<Record<InstagramTab, string>>(initialTabUrls);
  const [unread, setUnread] = useState<{ instagram: number; linkedin: number }>(initialUnread);
  const [scrollSignal, setScrollSignal] = useState(0);
  // A scanned Instagram link (T4, charter 8.7) overrides the tab URL until a
  // bottom tab is pressed, like the stories override below.
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Paste a link and the LinkedIn Post button (Denis, 23 Oct 2026).
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkedInOpen, setLinkedInOpen] = useState<{ url: string; id: number } | null>(null);
  const hostRef = useRef<InstagramHostHandle | null>(null);
  const postAttemptRef = useRef<PostAttempt>('idle');

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

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

  // Post (Denis, 15 Oct 2026): Instagram's own create flow, opened from the
  // current page. A page without the control (a DM thread) moves to the
  // profile tab and tries once more there.
  const startPost = useCallback(() => {
    tickHaptic(settings.haptics);
    postAttemptRef.current = 'idle';
    hostRef.current?.runScript(CREATE_SCRIPT);
  }, [settings.haptics]);

  const handleCreateMissing = useCallback(() => {
    if (postAttemptRef.current === 'idle' && !(activeTab === 'profile' && !stories && !scannedUrl)) {
      postAttemptRef.current = 'waiting';
      setScannedUrl(null);
      setStories(null);
      setActiveTab('profile');
      return;
    }
    postAttemptRef.current = 'idle';
    setToast('Posting is not available on this page');
  }, [activeTab, scannedUrl, stories]);

  const refreshTray = useCallback(() => {
    setStoriesStatus('loading');
    setTrayLoad((count) => count + 1);
  }, []);

  // The Stories button opens the native stories screen, or closes it when it
  // is already showing. While a story plays it goes back to the circles.
  const openStories = useCallback(() => {
    setScannedUrl(null);
    if (stories && stories.viewing === null) {
      setStories(null);
      setActiveTab(stories.origin);
      return;
    }
    setStories((current) =>
      current ? { ...current, viewing: null, seenStory: false } : { origin: activeTab, viewing: null, seenStory: false },
    );
    refreshTray();
  }, [activeTab, refreshTray, stories]);

  const selectBarItem = useCallback(
    (key: InstagramBarKey) => {
      if (key === 'post') startPost();
      else if (key === 'stories') openStories();
      else selectTab(key);
    },
    [openStories, selectTab, startPost],
  );

  const openStory = useCallback(
    (username: string) => {
      tickHaptic(settings.haptics);
      setStories((current) => (current ? { ...current, viewing: username, seenStory: false } : current));
    },
    [settings.haptics],
  );

  const closeStories = useCallback(() => {
    if (stories) setActiveTab(stories.origin);
    setStories(null);
  }, [stories]);

  // The hidden reader gets a fixed time; no tray by then is an empty tray,
  // never a fall back to the page.
  const trayShowing = stories !== null && stories.viewing === null;
  useEffect(() => {
    if (!trayShowing) return;
    const timer = setTimeout(() => {
      setStoriesStatus((status) => (status === 'loading' ? 'empty' : status));
    }, TRAY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [trayLoad, trayShowing]);

  const handleTrayMessage = useCallback((message: PageMessage) => {
    if (message.type === 'ig-stories') {
      if (message.items.length > 0) {
        setStoryItems(message.items);
        setStoriesStatus('ready');
      } else if (message.done) {
        setStoryItems([]);
        setStoriesStatus('empty');
      }
      return;
    }
    if (message.type === 'route' && pathOf(message.url)?.startsWith('/accounts/login')) {
      setStoriesStatus('login');
    }
  }, []);

  // LinkedIn's unread count for the switcher dot.
  const handleLinkedInMessage = useCallback((message: PageMessage) => {
    if (message.type !== 'unread') return;
    setUnread((prev) => (prev.linkedin === message.count ? prev : { ...prev, linkedin: message.count }));
  }, []);

  // A scanned Instagram link switches apps and moves the WebView, all in the
  // sheet's event handler (charter 8.7).
  const openInstagramUrl = useCallback((url: string): void => {
    setScannedUrl(url);
    setActiveApp('instagram');
  }, []);

  // A pasted link opens in its own app: Instagram like a scanned link (no
  // feed around it), LinkedIn in its page.
  const openPastedLink = useCallback(
    (link: Exclude<PastedLink, { kind: 'none' }>): void => {
      setLinkOpen(false);
      setQrOpen(false);
      if (link.kind === 'linkedin') {
        setActiveApp('linkedin');
        setLinkedInOpen((current) => ({ url: link.url, id: (current?.id ?? 0) + 1 }));
        return;
      }
      setStories(null);
      setActiveApp('instagram');
      // The same link again would not reload through the source prop.
      if (scannedUrl === link.url) hostRef.current?.runScript(`window.location.assign(${JSON.stringify(link.url)})`);
      setScannedUrl(link.url);
    },
    [scannedUrl],
  );

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
      if (message.type === 'ig-create-missing') {
        handleCreateMissing();
        return;
      }
      if (message.type !== 'route') return;
      const path = pathOf(message.url);
      if (!path) return;
      if (postAttemptRef.current === 'waiting') {
        // The profile page is loading: give it a moment to render its header.
        postAttemptRef.current = 'retried';
        setTimeout(() => hostRef.current?.runScript(CREATE_SCRIPT), 1500);
      }
      if (scannedUrl) {
        // Showing a scanned link (charter 8.7): tab URLs stay as they were, a
        // bottom tab press returns to them.
        return;
      }
      if (stories) {
        // The native circles are showing: the page behind them keeps still.
        if (stories.viewing === null) return;
        if (path.startsWith('/stories/')) {
          if (!stories.seenStory) setStories((current) => (current ? { ...current, seenStory: true } : current));
          return;
        }
        // The story ended or was closed. Instagram goes home, which the guard
        // sends to the inbox before it paints: back to the circles.
        if (path === '/' || (stories.seenStory && path.startsWith('/direct/inbox'))) {
          setStories((current) => (current ? { ...current, viewing: null, seenStory: false } : current));
          refreshTray();
          return;
        }
        // Browsing on from a story (a profile, a reply in DMs): that page
        // becomes the origin tab's page, without loading it again.
        const origin = stories.origin;
        setTabUrls((prev) => ({ ...prev, [origin]: message.url }));
        setStories(null);
        setActiveTab(origin);
        return;
      }
      setTabUrls((prev) => (prev[activeTab] === message.url ? prev : { ...prev, [activeTab]: message.url }));
    },
    [activeTab, handleCreateMissing, handleUsernameDetected, refreshTray, scannedUrl, stories],
  );

  // Android back button (section 8.6): WebView back, then the default tab,
  // then leave the app. The latest handler lives in a ref so the
  // subscription happens once with always fresh logic.
  const backHandlerRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    backHandlerRef.current = (): boolean => {
      if (activeApp !== 'instagram') return false;
      if (stories) {
        if (stories.viewing !== null) setStories({ ...stories, viewing: null, seenStory: false });
        else closeStories();
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
        left={
          <>
            {activeApp === 'linkedin' ? (
              <BarButton label="QR" active={qrOpen} onPress={() => setQrOpen((open) => !open)} icon={(color) => <IconQr color={color} />} />
            ) : null}
            <BarButton label="Open a link" active={linkOpen} onPress={() => setLinkOpen((open) => !open)} icon={(color) => <IconLink color={color} />} />
          </>
        }
        center={<AppSwitcher active={activeApp} unread={unread} onSelect={handleSelectApp} />}
        right={<BarButton label="Settings" onPress={() => router.push('/settings')} icon={(color) => <IconGear color={color} />} />}
      />
      <View style={[styles.hostArea, activeApp !== 'instagram' && styles.hidden]} testID="host-instagram">
        <View style={styles.hostArea}>
          {hydrated ? (
            <InstagramHost
              ref={hostRef}
              url={stories?.viewing ? storyUrl(stories.viewing) : (scannedUrl ?? tabUrls[activeTab])}
              context={stories?.viewing ? 'stories' : scannedUrl ? 'profile' : activeTab}
              settings={settings}
              onMessage={handleMessage}
              scrollToTopSignal={scrollSignal}
            />
          ) : null}
          {trayShowing ? (
            <View style={styles.cover}>
              {/* The hidden reader sits under the opaque stories screen. */}
              {hydrated ? <StoriesTrayReader key={trayLoad} settings={settings} onMessage={handleTrayMessage} /> : null}
              <View style={styles.cover}>
                <StoriesTray
                  status={storiesStatus}
                  items={storyItems}
                  onOpen={openStory}
                  onRetry={refreshTray}
                  onClose={closeStories}
                />
              </View>
            </View>
          ) : null}
        </View>
        <BottomBar<InstagramBarKey> tabs={INSTAGRAM_TABS} active={stories ? 'stories' : activeTab} onSelect={selectBarItem} />
        <Toast message={toast} />
      </View>
      <View style={[styles.hostArea, activeApp !== 'linkedin' && styles.hidden]} testID="host-linkedin">
        {hydrated ? (
          <LinkedInHost
            settings={settings}
            hideCounts={settings.hideCounts}
            haptics={settings.haptics}
            profileUrl={settings.liProfileUrl}
            logoutSignal={logout?.site === 'linkedin' ? logout.id : 0}
            qrOpen={qrOpen}
            onQrOpenChange={setQrOpen}
            onProfileVanityDetected={handleProfileVanityDetected}
            onOpenInstagramUrl={openInstagramUrl}
            onOpenSettings={() => router.push('/settings')}
            openRequest={linkedInOpen}
            onMessage={handleLinkedInMessage}
          />
        ) : null}
      </View>
      {linkOpen ? <LinkSheet onOpen={openPastedLink} onClose={() => setLinkOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hostArea: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  hidden: { display: 'none' },
});
