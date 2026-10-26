// The Unfeed shell: the app's own top bar with the app switcher, and both
// apps kept mounted so switching never loses a page (charter section 4).
//
// Instagram tabs (Denis, 26 Oct 2026): Search, Post, DMs, Notifications,
// Profile, with DMs in the middle. There is no Stories tab: friends' stories
// open from DMs or from their profile. Each tab has its own web view, made the
// first time the tab is opened and then kept, so a tab comes back exactly
// where it was left, scroll included, and never reloads on its own.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { BarButton, Header } from '@/components/Header';
import { IconAvatar, IconBell, IconChat, IconGear, IconLink, IconPlus, IconQr, IconSearch } from '@/components/icons';
import { LinkSheet } from '@/components/LinkSheet';
import { Toast } from '@/components/Toast';
import { InstagramHost, INSTAGRAM_HOME_URL, INSTAGRAM_LOGOUT_URL, type InstagramHostHandle } from '@/hosts/InstagramHost';
import { LinkedInHost } from '@/hosts/LinkedInHost';
import type { PageMessage } from '@/inject/protocol';
import type { PastedLink } from '@/link/pastedLink';
import { tickHaptic } from '@/state/haptics';
import { getStoreState, updateSettings, useStoreState } from '@/state/store';
import { colors } from '@/theme/tokens';

export type InstagramTab = 'search' | 'dms' | 'activity' | 'profile';

const DEFAULT_TAB: InstagramTab = 'dms';
const TAB_ORDER: InstagramTab[] = ['search', 'dms', 'activity', 'profile'];

/** Until the username is known, the Profile tab opens the edit profile page,
 * then moves to the real profile once the page reveals the username. */
const PROFILE_FALLBACK_URL = 'https://www.instagram.com/accounts/edit/';

function profileUrl(username: string | null | undefined): string {
  return username ? `https://www.instagram.com/${username}/` : PROFILE_FALLBACK_URL;
}

function startUrl(tab: InstagramTab): string {
  switch (tab) {
    case 'search':
      return 'https://www.instagram.com/explore/search/';
    case 'activity':
      return 'https://www.instagram.com/accounts/activity/';
    case 'profile':
      return profileUrl(getStoreState().settings.igUsername);
    default:
      return INSTAGRAM_HOME_URL;
  }
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
type InstagramBarKey = InstagramTab | 'post';

const INSTAGRAM_TABS: BottomTab<InstagramBarKey>[] = [
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'post', label: 'Post', icon: (color) => <IconPlus color={color} /> },
  { key: 'dms', label: 'DMs', icon: (color) => <IconChat color={color} /> },
  { key: 'activity', label: 'Notifications', icon: (color) => <IconBell color={color} /> },
  { key: 'profile', label: 'Profile', icon: (color) => <IconAvatar color={color} /> },
];

/** Calls the hook the Instagram inject script installs (src/inject/instagram.ts). */
const CREATE_SCRIPT = 'window.__UNFEED_CREATE__ && window.__UNFEED_CREATE__()';

/** Post flow: idle, waiting for the profile page after the current page had
 * no New post control, or retried there once. */
type PostAttempt = 'idle' | 'waiting' | 'retried';

type HostRefs = Partial<Record<InstagramTab, InstagramHostHandle | null>>;

export default function Index() {
  const { settings, hydrated, logout } = useStoreState();
  const [activeApp, setActiveApp] = useState<AppKey>(() => getStoreState().settings.lastApp);
  const [activeTab, setActiveTab] = useState<InstagramTab>(DEFAULT_TAB);
  // Tabs that have been opened, each with the address it started on. A tab's
  // web view is made on first open and kept from then on.
  const [opened, setOpened] = useState<Partial<Record<InstagramTab, string>>>(() => ({
    [DEFAULT_TAB]: startUrl(DEFAULT_TAB),
  }));
  const [unread, setUnread] = useState<{ instagram: number; linkedin: number }>(initialUnread);
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkedInOpen, setLinkedInOpen] = useState<{ url: string; id: number } | null>(null);
  const hostRefs = useRef<HostRefs>({});
  const activeTabRef = useRef(activeTab);
  useLayoutEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const postAttemptRef = useRef<PostAttempt>('idle');
  // The Profile tab's current address, to tell whether it still shows the
  // fallback page or the old profile when the username arrives.
  const profilePageRef = useRef<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Stored settings arrive a moment after launch: jump to the app Denis left
  // (charter section 6, lastApp). Adjusted during render, React's endorsed
  // pattern for state that follows a prop.
  const [lastHydrated, setLastHydrated] = useState(false);
  if (hydrated !== lastHydrated) {
    setLastHydrated(hydrated);
    if (hydrated) setActiveApp(settings.lastApp);
  }

  const handleSelectApp = useCallback((app: AppKey) => {
    tickHaptic(getStoreState().settings.haptics);
    setActiveApp(app);
    updateSettings({ lastApp: app });
  }, []);

  const activeHost = useCallback((): InstagramHostHandle | null => hostRefs.current[activeTabRef.current] ?? null, []);

  const selectTab = useCallback(
    (tab: InstagramTab) => {
      if (tab === activeTab) {
        // Active tab pressed again scrolls the page to the top (section 8.6).
        hostRefs.current[tab]?.scrollTop();
        return;
      }
      tickHaptic(settings.haptics);
      setOpened((current) => (current[tab] ? current : { ...current, [tab]: startUrl(tab) }));
      setActiveTab(tab);
    },
    [activeTab, settings.haptics],
  );

  // Post (Denis, 15 Oct 2026): Instagram's own create flow, opened from the
  // current page. A page without the control (a DM thread) moves to the
  // profile tab and tries once more there.
  const startPost = useCallback(() => {
    tickHaptic(settings.haptics);
    postAttemptRef.current = 'idle';
    activeHost()?.runScript(CREATE_SCRIPT);
  }, [activeHost, settings.haptics]);

  const handleCreateMissing = useCallback(() => {
    if (postAttemptRef.current === 'idle' && activeTabRef.current !== 'profile') {
      postAttemptRef.current = 'waiting';
      if (hostRefs.current.profile) {
        // The profile page is already there: try at once.
        postAttemptRef.current = 'retried';
        setActiveTab('profile');
        setTimeout(() => hostRefs.current.profile?.runScript(CREATE_SCRIPT), 300);
        return;
      }
      setOpened((current) => ({ ...current, profile: current.profile ?? startUrl('profile') }));
      setActiveTab('profile');
      return;
    }
    postAttemptRef.current = 'idle';
    setToast('Posting is not available on this page');
  }, []);

  const selectBarItem = useCallback(
    (key: InstagramBarKey) => {
      if (key === 'post') startPost();
      else selectTab(key);
    },
    [selectTab, startPost],
  );

  // LinkedIn's unread count for the switcher dot.
  const handleLinkedInMessage = useCallback((message: PageMessage) => {
    if (message.type !== 'unread') return;
    setUnread((prev) => (prev.linkedin === message.count ? prev : { ...prev, linkedin: message.count }));
  }, []);

  // A scanned or pasted Instagram link opens in the tab that is showing.
  const openInstagramUrl = useCallback(
    (url: string): void => {
      setActiveApp('instagram');
      activeHost()?.open(url);
    },
    [activeHost],
  );

  const openPastedLink = useCallback(
    (link: Exclude<PastedLink, { kind: 'none' }>): void => {
      setLinkOpen(false);
      setQrOpen(false);
      if (link.kind === 'linkedin') {
        setActiveApp('linkedin');
        setLinkedInOpen((current) => ({ url: link.url, id: (current?.id ?? 0) + 1 }));
        return;
      }
      openInstagramUrl(link.url);
    },
    [openInstagramUrl],
  );

  // The page reported the signed in username from Instagram's own nav
  // (section 8.5). Settings shows it, and the Profile tab moves to it while
  // it still shows the fallback page or an old profile.
  const handleUsernameDetected = useCallback((value: string): void => {
    const previous = getStoreState().settings.igUsername;
    if (previous === value) return;
    updateSettings({ igUsername: value });
    const page = profilePageRef.current;
    const target = profileUrl(value);
    const onOldStart = page === null || page.startsWith(PROFILE_FALLBACK_URL) || (previous !== null && page === profileUrl(previous));
    if (hostRefs.current.profile && onOldStart) hostRefs.current.profile.open(target);
    setOpened((current) => (current.profile && onOldStart ? { ...current, profile: target } : current));
  }, []);

  // LinkedIn reported its own profile URL (vanity detected): save it, the QR
  // My code screen and the settings screen read it from there (charter 6).
  const handleProfileVanityDetected = useCallback((liProfileUrl: string): void => {
    if (getStoreState().settings.liProfileUrl === liProfileUrl) return;
    updateSettings({ liProfileUrl });
  }, []);

  // Log out of Instagram (settings screen request): DMs visits the site's own
  // logout page, the other tabs close, then the inbox comes back and shows
  // the login. Expo Go has no per site cookie API; the site ending the
  // session is the cookie clearing (charter 8.8, see ASSUMPTIONS).
  const lastLogoutRef = useRef(0);
  useEffect(() => {
    if (!logout || logout.site !== 'instagram' || logout.id === lastLogoutRef.current) return;
    lastLogoutRef.current = logout.id;
    setActiveTab(DEFAULT_TAB);
    setOpened((current) => ({ [DEFAULT_TAB]: current[DEFAULT_TAB] ?? INSTAGRAM_HOME_URL }));
    hostRefs.current.dms?.clearCache();
    hostRefs.current.dms?.open(INSTAGRAM_LOGOUT_URL);
    const timer = setTimeout(() => hostRefs.current.dms?.open(INSTAGRAM_HOME_URL), 2500);
    return () => clearTimeout(timer);
  }, [logout]);

  const handleMessageFor = useCallback(
    (tab: InstagramTab) =>
      (message: PageMessage): void => {
        if (message.type === 'unread') {
          setUnread((prev) => (prev.instagram === message.count ? prev : { ...prev, instagram: message.count }));
          return;
        }
        if (message.type === 'ig-username') {
          handleUsernameDetected(message.value);
          return;
        }
        if (message.type === 'ig-create-missing') {
          if (tab === activeTabRef.current) handleCreateMissing();
          return;
        }
        if (message.type !== 'route') return;
        if (tab === 'profile') {
          profilePageRef.current = message.url;
          if (postAttemptRef.current === 'waiting') {
            // The profile page is loading: give it a moment to render its header.
            postAttemptRef.current = 'retried';
            setTimeout(() => hostRefs.current.profile?.runScript(CREATE_SCRIPT), 1500);
          }
        }
      },
    [handleCreateMissing, handleUsernameDetected],
  );

  // One stable message handler and ref setter per tab, so the web views never
  // resubscribe.
  const latestHandlerRef = useRef(handleMessageFor);
  useLayoutEffect(() => {
    latestHandlerRef.current = handleMessageFor;
  }, [handleMessageFor]);
  const perTab = useMemo(() => {
    const handlers = {} as Record<InstagramTab, (message: PageMessage) => void>;
    const refs = {} as Record<InstagramTab, (handle: InstagramHostHandle | null) => void>;
    for (const tab of TAB_ORDER) {
      handlers[tab] = (message) => latestHandlerRef.current(tab)(message);
      refs[tab] = (handle) => {
        hostRefs.current[tab] = handle;
      };
    }
    return { handlers, refs };
  }, []);

  // Android back button (section 8.6): back in the tab's page, then the
  // default tab, then leave the app.
  const backHandlerRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    backHandlerRef.current = (): boolean => {
      if (activeApp !== 'instagram') return false;
      const host = hostRefs.current[activeTab];
      if (host?.canGoBack()) {
        host.goBack();
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
          activeApp === 'linkedin' ? (
            <BarButton label="QR" active={qrOpen} onPress={() => setQrOpen((open) => !open)} icon={(color) => <IconQr color={color} />} />
          ) : (
            <BarButton label="Open a link" active={linkOpen} onPress={() => setLinkOpen((open) => !open)} icon={(color) => <IconLink color={color} />} />
          )
        }
        center={<AppSwitcher active={activeApp} unread={unread} onSelect={handleSelectApp} />}
        right={<BarButton label="Settings" onPress={() => router.push('/settings')} icon={(color) => <IconGear color={color} />} />}
      />
      <View style={[styles.hostArea, activeApp !== 'instagram' && styles.hidden]} testID="host-instagram">
        <View style={styles.hostArea}>
          {hydrated
            ? TAB_ORDER.map((tab) => {
                const url = opened[tab];
                if (!url) return null;
                return (
                  <View key={tab} style={[styles.cover, tab !== activeTab && styles.hidden]} testID={`ig-tab-${tab}`}>
                    <InstagramHost
                      ref={perTab.refs[tab]}
                      url={url}
                      homeUrl={tab === 'profile' ? profileUrl(settings.igUsername) : startUrl(tab)}
                      context={tab}
                      settings={settings}
                      onMessage={perTab.handlers[tab]}
                    />
                  </View>
                );
              })
            : null}
        </View>
        <BottomBar<InstagramBarKey> tabs={INSTAGRAM_TABS} active={activeTab} onSelect={selectBarItem} />
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
