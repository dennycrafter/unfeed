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

// Stories (Denis, 25 Oct 2026): the Stories button shows native circles read
// by a hidden web view. Instagram home never loads in the visible one.
function postFromPage(webview: unknown, message: Record<string, unknown>): Promise<void> {
  return fireEvent(webview as never, 'message', { nativeEvent: { data: JSON.stringify(message) } });
}

function visibleInstagram(getAllByTestId: (id: string, options?: object) => { props: { accessibilityHint?: string } }[]) {
  return getAllByTestId('webview-instagram', anyVisibility)[0];
}


test('both hosts stay mounted across app switches', async () => {
  await hydrateSettings();
  const { getByTestId, getByLabelText } = await render(<Shell />);
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(true);

  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);

  await fireEvent.press(getByLabelText('Instagram'));
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
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

// The app's own bars (Denis, 25 Oct 2026): the same top bar on both apps,
// Instagram tabs Stories, DMs, Search, Post, Profile and LinkedIn tabs
// Profile, Messages, Search, Post, Notifications.
test('both apps share one top bar: Link and Settings, plus QR on LinkedIn', async () => {
  await hydrateSettings();
  const { getByLabelText, queryByLabelText } = await render(<Shell />);
  expect(getByLabelText('Open a link')).toBeTruthy();
  expect(getByLabelText('Settings')).toBeTruthy();
  expect(queryByLabelText('QR')).toBeNull();

  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(getByLabelText('QR')).toBeTruthy();
  expect(getByLabelText('Open a link')).toBeTruthy();
  expect(getByLabelText('Settings')).toBeTruthy();
});

test('Instagram tabs are Stories, DMs, Search, Post, Profile in that order', async () => {
  await hydrateSettings();
  const { getAllByRole } = await render(<Shell />);
  const labels = getAllByRole('tab').map((tab) => tab.props.accessibilityLabel);
  expect(labels).toEqual(['Instagram', 'LinkedIn', 'Stories tab', 'DMs tab', 'Search tab', 'Post tab', 'Profile tab']);
});

test('LinkedIn tabs are Profile, Messages, Search, Post, Notifications, Profile at the bottom left', async () => {
  await hydrateSettings();
  const { getAllByRole, getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  const labels = getAllByRole('tab').map((tab) => tab.props.accessibilityLabel);
  expect(labels).toEqual(['Instagram', 'LinkedIn', 'Profile tab', 'Messages tab', 'Search tab', 'Post tab', 'Notifications tab']);
  expect(getByLabelText('Messages tab').props.accessibilityState).toEqual({ selected: true });
});

test('LinkedIn tabs steer the page and each tab keeps its place', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/messaging/');
  // Open a thread on Messages, then visit Notifications and come back.
  await postFromPage(getByTestId('webview-linkedin'), { type: 'route', url: 'https://www.linkedin.com/messaging/thread/2-abc/' });
  await fireEvent.press(getByLabelText('Notifications tab'));
  expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/notifications/');
  await fireEvent.press(getByLabelText('Profile tab'));
  expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/in/me/');
  await fireEvent.press(getByLabelText('Messages tab'));
  expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/messaging/thread/2-abc/');
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
    expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/search/results/people/?keywords=ada%20lovelace'),
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

function loadedUrl(getByTestId: (id: string, options?: object) => { props: { accessibilityHint?: string } }, site: string) {
  return getByTestId(`webview-${site}`, anyVisibility).props.accessibilityHint;
}

test('a pasted Instagram link opens inside the Instagram host and the pop-up closes', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, queryByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.changeText(getByLabelText('Link'), 'instagram.com/p/ABC123/');
  await fireEvent.press(getByLabelText('Open link'));
  await waitFor(() => expect(loadedUrl(getByTestId, 'instagram')).toBe('https://www.instagram.com/p/ABC123/'));
  expect(queryByTestId('link-sheet')).toBeNull();
});

test('Paste reads what was copied and opens it at once', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.press(getByLabelText('Paste'));
  await waitFor(() =>
    expect(loadedUrl(getByTestId, 'instagram')).toBe('https://www.instagram.com/reel/XYZ/?igsh=abc'),
  );
});

test('a pasted LinkedIn link switches to LinkedIn and opens there', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Open a link'));
  await fireEvent.changeText(getByLabelText('Link'), 'https://www.linkedin.com/in/someone/');
  await fireEvent.press(getByLabelText('Open link'));
  await waitFor(() => expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/in/someone/'));
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

test("LinkedIn's Post tab opens LinkedIn's own composer, then the tab comes back", async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await fireEvent.press(getByLabelText('Post tab'));
  await waitFor(() =>
    expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/feed/?shareActive=true'),
  );
  // Post is an action: Messages stays the active tab.
  expect(getByLabelText('Messages tab').props.accessibilityState).toEqual({ selected: true });
  await postFromPage(getByTestId('webview-linkedin'), { type: 'li-composer', open: false });
  expect(loadedUrl(getByTestId, 'linkedin')).toBe('https://www.linkedin.com/messaging/');
});

test('Stories shows the native stories screen; home loads only in the hidden reader', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, getAllByTestId, getByText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Stories tab'));
  expect(getByTestId('stories-tray')).toBeTruthy();
  expect(getByText('Loading stories...')).toBeTruthy();
  const reader = within(getByTestId('stories-tray-reader', anyVisibility)).getByTestId('webview-instagram', anyVisibility);
  expect(reader.props.accessibilityHint).toBe('https://www.instagram.com/');
  // The visible web view stays on the tab page; it never loads home.
  expect(visibleInstagram(getAllByTestId).props.accessibilityHint).toBe('https://www.instagram.com/direct/inbox/');
});

test('the circles come from the hidden reader, and a tap opens that story in the visible web view', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, getAllByTestId, queryByTestId, getByText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Stories tab'));
  const reader = within(getByTestId('stories-tray-reader', anyVisibility)).getByTestId('webview-instagram', anyVisibility);
  await postFromPage(reader, {
    type: 'ig-stories',
    items: [
      { username: 'alice', avatar: 'https://scontent.cdninstagram.com/alice.jpg' },
      { username: 'bob', avatar: null },
    ],
    done: true,
  });
  expect(getByText('alice')).toBeTruthy();
  expect(getByText('bob')).toBeTruthy();
  await fireEvent.press(getByLabelText("Watch bob's story"));
  expect(queryByTestId('stories-tray')).toBeNull();
  expect(queryByTestId('stories-tray-reader', anyVisibility)).toBeNull();
  const visible = visibleInstagram(getAllByTestId);
  expect(visible.props.accessibilityHint).toBe('https://www.instagram.com/stories/bob/');

  // The story plays, then closes: Instagram heads home, Unfeed shows the circles again.
  await postFromPage(visible, { type: 'route', url: 'https://www.instagram.com/stories/bob/123/' });
  await postFromPage(visible, { type: 'route', url: 'https://www.instagram.com/' });
  expect(getByTestId('stories-tray')).toBeTruthy();
});

test('an empty tray says so and never shows the page', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, getByText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Stories tab'));
  const reader = within(getByTestId('stories-tray-reader', anyVisibility)).getByTestId('webview-instagram', anyVisibility);
  await postFromPage(reader, { type: 'ig-stories', items: [], done: true });
  expect(getByText('No stories to show right now.')).toBeTruthy();
  expect(getByLabelText('Try again')).toBeTruthy();
});

test('no answer from the hidden reader in time counts as an empty tray', async () => {
  jest.useFakeTimers();
  try {
    await hydrateSettings();
    const { getByLabelText, getByText } = await render(<Shell />);
    await fireEvent.press(getByLabelText('Stories tab'));
    expect(getByText('Loading stories...')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(16000);
    });
    expect(getByText('No stories to show right now.')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test('a login page in the hidden reader asks to log in first', async () => {
  await hydrateSettings();
  const { getByLabelText, getByTestId, getByText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Stories tab'));
  const reader = within(getByTestId('stories-tray-reader', anyVisibility)).getByTestId('webview-instagram', anyVisibility);
  await postFromPage(reader, { type: 'route', url: 'https://www.instagram.com/accounts/login/?next=%2F' });
  expect(getByText(/Log in to Instagram first/)).toBeTruthy();
});

test('pressing Stories again or a tab closes the stories screen', async () => {
  await hydrateSettings();
  const { getByLabelText, queryByTestId } = await render(<Shell />);
  await fireEvent.press(getByLabelText('Stories tab'));
  expect(queryByTestId('stories-tray')).toBeTruthy();
  await fireEvent.press(getByLabelText('Stories tab'));
  expect(queryByTestId('stories-tray')).toBeNull();
  await fireEvent.press(getByLabelText('Stories tab'));
  await fireEvent.press(getByLabelText('Search tab'));
  expect(queryByTestId('stories-tray')).toBeNull();
});

// Blocked pages (Denis, 25 Oct 2026): every redirect lands in the bounce log.
test('a redirect in the page is kept in the bounce log with its rule', async () => {
  const { getBounces, resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  await hydrateSettings();
  const { getAllByTestId } = await render(<Shell />);
  await postFromPage(visibleInstagram(getAllByTestId), { type: 'route', url: 'https://www.instagram.com/reels/' });
  expect(getBounces()[0]).toMatchObject({ site: 'instagram', url: 'https://www.instagram.com/reels/', rule: 'ig-8-reels', to: '/direct/inbox/' });
  // An allowed page is never logged.
  await postFromPage(visibleInstagram(getAllByTestId), { type: 'route', url: 'https://www.instagram.com/p/abc/' });
  expect(getBounces()).toHaveLength(1);
});

test('a bounce the page reports itself is kept too', async () => {
  const { getBounces, resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  await hydrateSettings();
  const { getByTestId, getByLabelText } = await render(<Shell />);
  await fireEvent.press(getByLabelText('LinkedIn'));
  await postFromPage(getByTestId('webview-linkedin'), {
    type: 'bounce',
    url: 'https://www.linkedin.com/feed/',
    rule: 'li-composer-closed',
    to: '/messaging/',
  });
  expect(getBounces()[0]).toMatchObject({ site: 'linkedin', rule: 'li-composer-closed' });
});
