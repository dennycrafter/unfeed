// X host (Denis, 21 Nov 2026), steered by the app's own tab bar: Search,
// Post, DMs, Notifications, Profile, opening on DMs like the other apps.
// Profiles and search work as normal; only the feeds and Explore are gone. X's own bars
// are hidden by the inject script (src/inject/x.ts) and the home timeline,
// explore and search never load (src/rules/x.json). Each tab has its own web
// view, made the first time it opens and then kept. Notifications and
// Profile load in the background soon after X is first opened. Post opens
// X's own composer in the tab that is showing; when it closes, the page goes
// back to where it was.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomBar, type BottomTab } from '../components/BottomBar';
import { EmptyState } from '../components/EmptyState';
import { IconAvatar, IconBell, IconChat, IconPlus, IconSearch } from '../components/icons';
import { SearchBar } from '../components/SearchBar';
import type { PageMessage } from '../inject/protocol';
import { X_INJECT_SCRIPT } from '../inject/generated/x.generated';
import type { DecideSettings } from '../rules/decide';
import { tickHaptic } from '../state/haptics';
import { loadRecentSearches, nextRecentSearches, saveRecentSearches, X_RECENT_SEARCHES_KEY } from '../state/recentSearches';
import { colors } from '../theme/tokens';
import type { WebViewHostApi } from './types';
import { WebViewHost } from './WebViewHost';

export const X_MESSAGES_URL = 'https://x.com/messages';
export const X_NOTIFICATIONS_URL = 'https://x.com/notifications';
export const X_COMPOSE_URL = 'https://x.com/compose/post';
/** X's sign out page; it asks to confirm with its own button. */
export const X_LOGOUT_URL = 'https://x.com/logout';
/** Until the username is known, the Profile tab opens the profile editor,
 * then moves to the real profile once the page reveals the username. */
export const X_PROFILE_FALLBACK_URL = 'https://x.com/settings/profile';

export type XTab = 'search' | 'messages' | 'notifications' | 'profile';
type XBarKey = XTab | 'post';

const DEFAULT_TAB: XTab = 'messages';
const TAB_ORDER: XTab[] = ['search', 'messages', 'notifications', 'profile'];

/** Loaded in the background after X first opens, one after another. */
export const X_PRELOAD_TABS: XTab[] = ['notifications', 'profile'];
export const X_PRELOAD_FIRST_MS = 2500;
export const X_PRELOAD_GAP_MS = 2500;

const TABS: BottomTab<XBarKey>[] = [
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'post', label: 'Post', icon: (color) => <IconPlus color={color} /> },
  { key: 'messages', label: 'DMs', icon: (color) => <IconChat color={color} /> },
  { key: 'notifications', label: 'Notifications', icon: (color) => <IconBell color={color} /> },
  { key: 'profile', label: 'Profile', icon: (color) => <IconAvatar color={color} /> },
];

/** X's own search results for what was typed. */
export function xSearchUrl(query: string): string {
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`;
}

export function xProfileUrl(username: string | null | undefined): string {
  return username ? `https://x.com/${username}` : X_PROFILE_FALLBACK_URL;
}

/** The Search tab has no page until the first search. */
function startUrl(tab: XTab, username: string | null | undefined): string | null {
  switch (tab) {
    case 'search':
      return null;
    case 'notifications':
      return X_NOTIFICATIONS_URL;
    case 'profile':
      return xProfileUrl(username);
    default:
      return X_MESSAGES_URL;
  }
}

export interface XHostHandle {
  /** Opens an address in the tab that is showing. */
  open(url: string): void;
}

export interface XHostProps {
  settings: DecideSettings;
  hideCounts?: boolean;
  haptics?: boolean;
  /** The signed in username from settings, for the Profile tab. */
  username?: string | null;
  /** Fires when the page reveals the signed in username. */
  onUsernameDetected?: (username: string) => void;
  /** Bump to sign out: DMs visits X's own sign out page. */
  logoutSignal?: number;
  /** Whether X is the app showing (speed log). */
  visible?: boolean;
  /** A pasted X link to open; the id makes the same link open twice. */
  openRequest?: { url: string; id: number } | null;
  onMessage?: (message: PageMessage) => void;
  style?: StyleProp<ViewStyle>;
}

export const XHost = forwardRef<XHostHandle, XHostProps>(function XHost(
  {
    settings,
    hideCounts = false,
    haptics = true,
    username,
    onUsernameDetected,
    logoutSignal = 0,
    visible = true,
    openRequest = null,
    onMessage,
    style,
  },
  ref,
) {
  const hostRefs = useRef<Partial<Record<XTab, WebViewHostApi | null>>>({});
  const [activeTab, setActiveTab] = useState<XTab>(DEFAULT_TAB);
  const [opened, setOpened] = useState<Partial<Record<XTab, string>>>(() => ({ [DEFAULT_TAB]: X_MESSAGES_URL }));
  const [seen, setSeen] = useState<Partial<Record<XTab, true>>>(() => ({ [DEFAULT_TAB]: true }));
  if (!seen[activeTab]) setSeen((current) => ({ ...current, [activeTab]: true }));

  const openedRef = useRef(opened);
  useLayoutEffect(() => {
    openedRef.current = opened;
  }, [opened]);
  const activeTabRef = useRef(activeTab);
  useLayoutEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const usernameRef = useRef(username);
  useLayoutEffect(() => {
    usernameRef.current = username;
  }, [username]);
  // The Profile tab's current address, to tell whether it still shows the
  // fallback page when the username arrives.
  const profilePageRef = useRef<string | null>(null);

  useEffect(() => {
    const timers = X_PRELOAD_TABS.map((tab, index) =>
      setTimeout(
        () =>
          setOpened((current) => {
            const start = startUrl(tab, usernameRef.current);
            return current[tab] || !start ? current : { ...current, [tab]: start };
          }),
        X_PRELOAD_FIRST_MS + index * X_PRELOAD_GAP_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open(url: string) {
        hostRefs.current[activeTabRef.current]?.open(url);
      },
    }),
    [],
  );

  // A pasted X link opens in the tab that is showing.
  const lastOpenRef = useRef(0);
  useEffect(() => {
    if (!openRequest || openRequest.id === lastOpenRef.current) return;
    lastOpenRef.current = openRequest.id;
    hostRefs.current[activeTabRef.current]?.open(openRequest.url);
  }, [openRequest]);

  // Sign out (settings screen request): DMs shows X's own sign out page,
  // which asks to confirm; the other tabs close.
  const lastLogoutRef = useRef(0);
  useEffect(() => {
    if (logoutSignal === 0 || logoutSignal === lastLogoutRef.current) return;
    lastLogoutRef.current = logoutSignal;
    setActiveTab(DEFAULT_TAB);
    setOpened((current) => ({ [DEFAULT_TAB]: current[DEFAULT_TAB] ?? X_MESSAGES_URL }));
    hostRefs.current.messages?.open(X_LOGOUT_URL);
  }, [logoutSignal]);

  const handleUsername = useCallback(
    (value: string): void => {
      const previous = usernameRef.current;
      if (previous === value) return;
      onUsernameDetected?.(value);
      const page = profilePageRef.current;
      const onOldStart = page === null || page.startsWith(X_PROFILE_FALLBACK_URL) || (previous ? page === xProfileUrl(previous) : false);
      if (!onOldStart) return;
      const target = xProfileUrl(value);
      hostRefs.current.profile?.open(target);
      setOpened((current) => (current.profile ? { ...current, profile: target } : current));
    },
    [onUsernameDetected],
  );

  const onMessageRef = useRef(onMessage);
  useLayoutEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  const handleUsernameRef = useRef(handleUsername);
  useLayoutEffect(() => {
    handleUsernameRef.current = handleUsername;
  }, [handleUsername]);

  // One stable message handler and ref setter per tab.
  const perTab = useMemo(() => {
    const handlers = {} as Record<XTab, (message: PageMessage) => void>;
    const refs = {} as Record<XTab, (handle: WebViewHostApi | null) => void>;
    for (const tab of TAB_ORDER) {
      handlers[tab] = (message) => {
        if (message.type === 'x-username') handleUsernameRef.current(message.value);
        if (message.type === 'route' && tab === 'profile') profilePageRef.current = message.url;
        onMessageRef.current?.(message);
      };
      refs[tab] = (handle) => {
        hostRefs.current[tab] = handle;
      };
    }
    return { handlers, refs };
  }, []);

  const selectTab = useCallback(
    (key: XBarKey): void => {
      if (key === 'post') {
        tickHaptic(haptics);
        hostRefs.current[activeTabRef.current]?.open(X_COMPOSE_URL);
        return;
      }
      if (key === activeTabRef.current) {
        hostRefs.current[key]?.scrollTop();
        return;
      }
      tickHaptic(haptics);
      setOpened((current) => {
        const start = startUrl(key, usernameRef.current);
        return current[key] || !start ? current : { ...current, [key]: start };
      });
      setActiveTab(key);
    },
    [haptics],
  );

  // Search: X's own results for what was typed, with the last searches kept.
  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void loadRecentSearches(X_RECENT_SEARCHES_KEY).then((saved) => {
      if (alive) setRecents(saved);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSearch = useCallback((query: string): void => {
    const target = xSearchUrl(query);
    if (openedRef.current.search) hostRefs.current.search?.open(target);
    else setOpened((current) => ({ ...current, search: target }));
    setRecents((current) => {
      const next = nextRecentSearches(current, query);
      void saveRecentSearches(next, X_RECENT_SEARCHES_KEY);
      return next;
    });
  }, []);

  // Android back: back in the tab's page, then DMs, then leave.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!visible) return false;
      const host = hostRefs.current[activeTabRef.current];
      if (host?.canGoBack()) {
        host.goBack();
        return true;
      }
      if (activeTabRef.current !== DEFAULT_TAB) {
        setActiveTab(DEFAULT_TAB);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [visible]);

  return (
    <View style={[styles.fill, style]}>
      {activeTab === 'search' ? <SearchBar recents={recents} onSubmit={handleSearch} placeholder="Search X" /> : null}
      <View style={styles.fill}>
        {TAB_ORDER.map((tab) => {
          const url = opened[tab];
          if (!url) return null;
          const showing = tab === activeTab;
          return (
            <View
              key={tab}
              style={[styles.cover, !showing && (seen[tab] ? styles.hidden : styles.preloading)]}
              pointerEvents={showing ? 'auto' : 'none'}
              accessibilityElementsHidden={!showing}
              importantForAccessibility={showing ? 'auto' : 'no-hide-descendants'}
              testID={`x-tab-${tab}`}
            >
              <WebViewHost
                ref={perTab.refs[tab]}
                site="x"
                url={url}
                context="page"
                homeUrl={startUrl(tab, username) ?? X_MESSAGES_URL}
                settings={settings}
                hideCounts={hideCounts}
                injectScript={X_INJECT_SCRIPT}
                onMessage={perTab.handlers[tab]}
                placeholderLabel={`X ${tab} (web preview)`}
                active={visible && showing}
              />
            </View>
          );
        })}
        {activeTab === 'search' && !opened.search ? (
          <View style={styles.cover}>
            <EmptyState message="Search X for people, posts and topics. The feed never shows here." />
          </View>
        ) : null}
      </View>
      <BottomBar<XBarKey> tabs={TABS} active={activeTab} onSelect={selectTab} />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  hidden: { display: 'none' },
  preloading: { opacity: 0, zIndex: -1 },
});
