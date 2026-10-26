// Charter T5 acceptance: a React Native Testing Library render test proves
// switching apps never unmounts either host, lastApp is saved on switch and
// restored on the next launch, and the haptics toggle is respected. The
// WebView is mocked as a plain view tagged with the site name so the test can
// see both hosts in the tree.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn().mockResolvedValue('Look at this https://www.instagram.com/reel/XYZ/?igsh=abc'),
}));

jest.mock('expo-audio', () => ({ setAudioModeAsync: jest.fn().mockResolvedValue(undefined) }));

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

// jest-expo mocks the native safe area views as childless, so the provider
// would swallow the whole shell. A passthrough provider with zero insets is
// the standard test stand in.
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: function SafeAreaProvider(props: { children?: React.ReactNode }) {
      return <View testID="safe-area-provider" style={{ flex: 1 }}>{props.children}</View>;
    },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

const mockInjectJavaScript = jest.fn();

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef(function MockWebView(
    props: { testID?: string; source?: { uri?: string }; onMessage?: (event: unknown) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      goBack: () => undefined,
      canGoBack: () => false,
      clearCache: () => undefined,
      reload: () => undefined,
      scrollTo: () => undefined,
      injectJavaScript: (code: string) => mockInjectJavaScript(props.testID, code),
      stopLoading: () => undefined,
    }));
    // The loaded address rides on the hint so tests can read it.
    // onMessage rides along so tests can post page messages with fireEvent.
    return <View testID={props.testID} accessibilityHint={props.source?.uri} onMessage={props.onMessage} />;
  });
  return { __esModule: true, WebView, default: WebView };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Index from '../../src/app/index';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../../src/state/settings';
import { hydrateSettings, updateSettings } from '../../src/state/store';

function Shell() {
  return (
    <SafeAreaProvider>
      <Index />
    </SafeAreaProvider>
  );
}

interface StylefulElement {
  props: { style?: unknown };
}

function isHidden(element: StylefulElement): boolean {
  const style = element.props.style;
  if (!style || typeof style !== 'object') return false;
  const flat = Array.isArray(style) ? StyleSheet.flatten(style) : (style as Record<string, unknown>);
  return flat.display === 'none';
}

async function storedSettings(): Promise<Record<string, unknown>> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return JSON.parse(raw ?? '{}') as Record<string, unknown>;
}

// The parked host is hidden with display none, and RNTL queries skip hidden
// elements by default. Persistence checks must see hidden hosts, so every
// host and webview query opts in.
const anyVisibility = { includeHiddenElements: true } as const;

beforeEach(async () => {
  await AsyncStorage.clear();
});

function postFromPage(webview: unknown, message: Record<string, unknown>): Promise<void> {
  return fireEvent(webview as never, 'message', { nativeEvent: { data: JSON.stringify(message) } });
}

type GetByTestId = (id: string, options?: object) => { props: { accessibilityHint?: string } };

/** The web view of one Instagram or LinkedIn tab (each tab has its own). */
function tabWebView(getByTestId: GetByTestId, tab: string) {
  const site = tab.startsWith('li-') ? 'linkedin' : 'instagram';
  return within(getByTestId(tab, anyVisibility) as never).getByTestId(`webview-${site}`, anyVisibility) as unknown as {
    props: { accessibilityHint?: string };
  };
}

test('both hosts stay mounted across app switches', async () => {
  await hydrateSettings();
  const { getByTestId, getAllByTestId, getByLabelText } = await render(<Shell />);
  expect(getAllByTestId('webview-instagram', anyVisibility).length).toBeGreaterThan(0);
  expect(getAllByTestId('webview-linkedin', anyVisibility).length).toBeGreaterThan(0);
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(true);

  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(getAllByTestId('webview-instagram', anyVisibility).length).toBeGreaterThan(0);
  expect(getAllByTestId('webview-linkedin', anyVisibility).length).toBeGreaterThan(0);
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);

  await fireEvent.press(getByLabelText('Instagram'));
  expect(getAllByTestId('webview-instagram', anyVisibility).length).toBeGreaterThan(0);
  expect(getAllByTestId('webview-linkedin', anyVisibility).length).toBeGreaterThan(0);
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(true);
});

test('switching apps saves lastApp for the next launch', async () => {
  await hydrateSettings();
  const { getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await waitFor(async () => expect((await storedSettings()).lastApp).toBe('linkedin'));
});

test('the next launch opens the app that was last used', async () => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, lastApp: 'linkedin' }),
  );
  await hydrateSettings();
  const { getByTestId } = await render(<Shell />);
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);
});

test('the Instagram Post button opens the create flow in the page, not a tab', async () => {
  await hydrateSettings();
  mockInjectJavaScript.mockClear();
  const { getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Post tab'));
  expect(mockInjectJavaScript).toHaveBeenCalledWith('webview-instagram', expect.stringContaining('__UNFEED_CREATE__'));
  // DMs stays the active tab: Post is an action.
  expect(getByLabelText('DMs tab').props.accessibilityState).toEqual({ selected: true });
});

// Top bar (Denis, 26 Oct 2026): Link only on Instagram, QR only on LinkedIn.
test('the top bar has Link on Instagram, QR on LinkedIn, and Settings on both', async () => {
  await hydrateSettings();
  const { getByLabelText, queryByLabelText } = await render(<Shell />);
  expect(getByLabelText('Open a link')).toBeTruthy();
  expect(getByLabelText('Settings')).toBeTruthy();
  expect(queryByLabelText('QR')).toBeNull();

  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(getByLabelText('QR')).toBeTruthy();
  expect(queryByLabelText('Open a link')).toBeNull();
  expect(getByLabelText('Settings')).toBeTruthy();
});

// Instagram tabs (Denis, 26 Oct 2026): no Stories tab, DMs in the middle.
test('Instagram tabs are Search, Post, DMs, Notifications, Profile, with DMs in the middle', async () => {
  await hydrateSettings();
  const { getAllByRole, queryByLabelText } = await render(<Shell />);
  const labels = getAllByRole('tab').map((tab) => tab.props.accessibilityLabel);
  expect(labels).toEqual(['Instagram', 'LinkedIn', 'Search tab', 'Post tab', 'DMs tab', 'Notifications tab', 'Profile tab']);
  expect(queryByLabelText('Stories tab')).toBeNull();
});

test('each Instagram tab has its own page, made on first open and kept', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, queryByTestId } = await render(<Shell />);
  expect(tabWebView(getByTestId, 'ig-tab-dms').props.accessibilityHint).toBe('https://www.instagram.com/direct/inbox/');
  expect(queryByTestId('ig-tab-search', anyVisibility)).toBeNull();

  await fireEvent.press(getByLabelText('Search tab'));
  expect(tabWebView(getByTestId, 'ig-tab-search').props.accessibilityHint).toBe('https://www.instagram.com/explore/search/');
  await fireEvent.press(getByLabelText('Notifications tab'));
  expect(tabWebView(getByTestId, 'ig-tab-activity').props.accessibilityHint).toBe('https://www.instagram.com/accounts/activity/');

  // A thread opened in DMs stays: the page's own moves never reload it.
  await postFromPage(tabWebView(getByTestId, 'ig-tab-dms'), { type: 'route', url: 'https://www.instagram.com/direct/t/123/' });
  await fireEvent.press(getByLabelText('DMs tab'));
  expect(tabWebView(getByTestId, 'ig-tab-dms').props.accessibilityHint).toBe('https://www.instagram.com/direct/inbox/');
  expect(isHidden(getByTestId('ig-tab-dms', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('ig-tab-search', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('ig-tab-activity', anyVisibility))).toBe(true);
});

test('Profile opens the signed in profile, never DMs', async () => {
  await hydrateSettings();
  updateSettings({ igUsername: 'denis' });
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Profile tab'));
  expect(tabWebView(getByTestId, 'ig-tab-profile').props.accessibilityHint).toBe('https://www.instagram.com/denis/');
  // A DM route reported by the DMs page never moves the Profile tab.
  await postFromPage(tabWebView(getByTestId, 'ig-tab-dms'), { type: 'route', url: 'https://www.instagram.com/direct/inbox/' });
  expect(tabWebView(getByTestId, 'ig-tab-profile').props.accessibilityHint).toBe('https://www.instagram.com/denis/');
});

test('a detected username fixes Settings and moves the Profile tab off the old name', async () => {
  await hydrateSettings();
  updateSettings({ igUsername: 'friend_from_a_story' });
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Profile tab'));
  await postFromPage(tabWebView(getByTestId, 'ig-tab-dms'), { type: 'ig-username', value: 'denis' });
  await waitFor(async () => expect((await storedSettings()).igUsername).toBe('denis'));
  expect(tabWebView(getByTestId, 'ig-tab-profile').props.accessibilityHint).toBe('https://www.instagram.com/denis/');
});

test('LinkedIn tabs are Profile, Messages, Search, Post, Notifications, Profile at the bottom left', async () => {
  await hydrateSettings();
  const { getAllByRole, getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  const labels = getAllByRole('tab').map((tab) => tab.props.accessibilityLabel);
  expect(labels).toEqual(['Instagram', 'LinkedIn', 'Profile tab', 'Messages tab', 'Search tab', 'Post tab', 'Notifications tab']);
  expect(getByLabelText('Messages tab').props.accessibilityState).toEqual({ selected: true });
});

test('each LinkedIn tab has its own page and keeps it', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(tabWebView(getByTestId, 'li-tab-messages').props.accessibilityHint).toBe('https://www.linkedin.com/messaging/');
  await postFromPage(tabWebView(getByTestId, 'li-tab-messages'), { type: 'route', url: 'https://www.linkedin.com/messaging/thread/2-abc/' });
  await fireEvent.press(getByLabelText('Notifications tab'));
  expect(tabWebView(getByTestId, 'li-tab-notifications').props.accessibilityHint).toBe('https://www.linkedin.com/notifications/');
  await fireEvent.press(getByLabelText('Profile tab'));
  expect(tabWebView(getByTestId, 'li-tab-profile').props.accessibilityHint).toBe('https://www.linkedin.com/in/me/');
  await fireEvent.press(getByLabelText('Messages tab'));
  // Messages was never reloaded: same web view, same start address.
  expect(tabWebView(getByTestId, 'li-tab-messages').props.accessibilityHint).toBe('https://www.linkedin.com/messaging/');
  expect(isHidden(getByTestId('li-tab-messages', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('li-tab-profile', anyVisibility))).toBe(true);
});

test('LinkedIn Search shows a native search box, and a search opens people results', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, getByText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await fireEvent.press(getByLabelText('Search tab'));
  expect(getByText('Search for people by name. Posts never show here.')).toBeTruthy();
  await fireEvent.changeText(getByLabelText('Search people'), 'ada lovelace');
  await fireEvent(getByLabelText('Search people'), 'submitEditing');
  await waitFor(() =>
    expect(tabWebView(getByTestId, 'li-tab-search').props.accessibilityHint).toBe(
      'https://www.linkedin.com/search/results/people/?keywords=ada%20lovelace',
    ),
  );
});

test('the QR panel opens from the top bar on LinkedIn and closes', async () => {
  await hydrateSettings();
  const { getByLabelText, queryByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await fireEvent.press(getByLabelText('QR'));
  await waitFor(() => expect(getByLabelText('Close QR')).toBeTruthy());
  await fireEvent.press(getByLabelText('Close QR'));
  await waitFor(() => expect(queryByLabelText('Close QR')).toBeNull());
});

test('haptics follow the settings toggle', async () => {
  const Haptics = require('expo-haptics');
  // Haptics default to on (charter section 6): a switch tick fires.
  await hydrateSettings();
  const { getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalled());

  // With the toggle off, switching stays silent.
  Haptics.impactAsync.mockClear();
  updateSettings({ haptics: false });
  await fireEvent.press(getByLabelText('Instagram'));
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

test('a pasted Instagram link opens inside the Instagram host and the pop-up closes', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, queryByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.changeText(getByLabelText('Link'), 'instagram.com/p/ABC123/');
  await fireEvent.press(getByLabelText('Open link'));
  await waitFor(() => expect(tabWebView(getByTestId, 'ig-tab-dms').props.accessibilityHint).toBe('https://www.instagram.com/p/ABC123/'));
  expect(queryByTestId('link-sheet')).toBeNull();
});

test('Paste reads what was copied and opens it at once', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.press(getByLabelText('Paste'));
  await waitFor(() =>
    expect(tabWebView(getByTestId, 'ig-tab-dms').props.accessibilityHint).toBe('https://www.instagram.com/reel/XYZ/?igsh=abc'),
  );
});

test('a pasted LinkedIn link switches to LinkedIn and opens there', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.changeText(getByLabelText('Link'), 'https://www.linkedin.com/in/someone/');
  await fireEvent.press(getByLabelText('Open link'));
  await waitFor(() => expect(tabWebView(getByTestId, 'li-tab-messages').props.accessibilityHint).toBe('https://www.linkedin.com/in/someone/'));
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);
});

test('text that is not a link Unfeed opens shows a short error and stays open', async () => {
  await hydrateSettings();
  const { getByLabelText, getByText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.changeText(getByLabelText('Link'), 'https://example.com/page');
  await fireEvent.press(getByLabelText('Open link'));
  expect(getByText('That is not an Instagram or LinkedIn link.')).toBeTruthy();
  expect(getByTestId('link-sheet')).toBeTruthy();
});

test("LinkedIn's Post tab opens LinkedIn's own composer over the tab, then the tab comes back", async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, queryByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await fireEvent.press(getByLabelText('Post tab'));
  const composer = within(getByTestId('li-composer') as never).getByTestId('webview-linkedin') as unknown as {
    props: { accessibilityHint?: string };
  };
  expect(composer.props.accessibilityHint).toBe('https://www.linkedin.com/feed/?shareActive=true');
  // Post is an action: Messages stays the active tab.
  expect(getByLabelText('Messages tab').props.accessibilityState).toEqual({ selected: true });
  await postFromPage(composer, { type: 'li-composer', open: false });
  expect(queryByTestId('li-composer')).toBeNull();
  expect(tabWebView(getByTestId, 'li-tab-messages').props.accessibilityHint).toBe('https://www.linkedin.com/messaging/');
});

// Blocked pages (Denis, 25 Oct 2026): every redirect lands in the bounce log.
// The page enforces its own moves; native steps in only if the page is still
// on the blocked address a moment later, so nothing loads twice.
test('a blocked page the page did not leave is redirected by native and logged', async () => {
  const { getBounces, resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  jest.useFakeTimers();
  try {
    await hydrateSettings();
    const { getByTestId } = await render(<Shell />);
    mockInjectJavaScript.mockClear();
    await postFromPage(tabWebView(getByTestId, 'ig-tab-dms'), { type: 'route', url: 'https://www.instagram.com/explore/' });
    expect(getBounces()).toHaveLength(0);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(getBounces()[0]).toMatchObject({ site: 'instagram', url: 'https://www.instagram.com/explore/', rule: 'ig-7-explore', to: '/explore/search/' });
    expect(mockInjectJavaScript).toHaveBeenCalledWith('webview-instagram', expect.stringContaining('/explore/search/'));
    // An allowed page is never logged.
    await postFromPage(tabWebView(getByTestId, 'ig-tab-dms'), { type: 'route', url: 'https://www.instagram.com/p/abc/' });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(getBounces()).toHaveLength(1);
  } finally {
    jest.useRealTimers();
  }
});

test('a page that leaves the blocked address itself is never moved twice', async () => {
  jest.useFakeTimers();
  try {
    await hydrateSettings();
    const { getByTestId } = await render(<Shell />);
    mockInjectJavaScript.mockClear();
    const dms = tabWebView(getByTestId, 'ig-tab-dms');
    await postFromPage(dms, { type: 'route', url: 'https://www.instagram.com/reels/' });
    await postFromPage(dms, { type: 'route', url: 'https://www.instagram.com/direct/inbox/' });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockInjectJavaScript).not.toHaveBeenCalledWith('webview-instagram', expect.stringContaining('location.replace'));
  } finally {
    jest.useRealTimers();
  }
});

// Home and feed redirects go back (Denis, 26 Oct 2026): a story that ends on
// a friend's profile returns to that profile, not to DMs.
test('a story ending on the Profile tab returns to the profile it came from', async () => {
  jest.useFakeTimers();
  try {
    await hydrateSettings();
    updateSettings({ igUsername: 'denis' });
    const { getByLabelText, getByTestId } = await render(<Shell />);
    await fireEvent.press(getByLabelText('Profile tab'));
    const profile = tabWebView(getByTestId, 'ig-tab-profile');
    mockInjectJavaScript.mockClear();
    await postFromPage(profile, { type: 'route', url: 'https://www.instagram.com/a_friend/' });
    await postFromPage(profile, { type: 'route', url: 'https://www.instagram.com/stories/a_friend/123/' });
    await postFromPage(profile, { type: 'route', url: 'https://www.instagram.com/' });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockInjectJavaScript).toHaveBeenCalledWith(
      'webview-instagram',
      expect.stringContaining('"https://www.instagram.com/a_friend/"'),
    );
    expect(mockInjectJavaScript).not.toHaveBeenCalledWith('webview-instagram', expect.stringContaining('/direct/inbox/'));
  } finally {
    jest.useRealTimers();
  }
});

test('a bounce the page reports itself is kept too', async () => {
  const { getBounces, resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  await hydrateSettings();
  const { getByTestId, getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await postFromPage(tabWebView(getByTestId, 'li-tab-messages'), {
    type: 'bounce',
    url: 'https://www.linkedin.com/feed/',
    rule: 'li-composer-closed',
    to: '/messaging/',
  });
  expect(getBounces()[0]).toMatchObject({ site: 'linkedin', rule: 'li-composer-closed' });
});
