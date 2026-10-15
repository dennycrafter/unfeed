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
}));

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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef(function MockWebView(props: { testID?: string }, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({
      goBack: () => undefined,
      canGoBack: () => false,
      clearCache: () => undefined,
      reload: () => undefined,
      scrollTo: () => undefined,
      injectJavaScript: () => undefined,
      stopLoading: () => undefined,
    }));
    return <View testID={props.testID} />;
  });
  return { __esModule: true, WebView, default: WebView };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

test('both hosts stay mounted across app switches', async () => {
  await hydrateSettings();
  const { getByTestId, getByLabelText } = render(<Shell />);
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(true);

  fireEvent.press(getByLabelText('LinkedIn'));
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);

  fireEvent.press(getByLabelText('Instagram'));
  expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
  expect(getByTestId('webview-linkedin', anyVisibility)).toBeTruthy();
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(true);
});

test('switching apps saves lastApp for the next launch', async () => {
  await hydrateSettings();
  const { getByLabelText } = render(<Shell />);
  fireEvent.press(getByLabelText('LinkedIn'));
  await waitFor(async () => expect((await storedSettings()).lastApp).toBe('linkedin'));
});

test('the next launch opens the app that was last used', async () => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, lastApp: 'linkedin' }),
  );
  await hydrateSettings();
  const { getByTestId } = render(<Shell />);
  expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(true);
  expect(isHidden(getByTestId('host-linkedin', anyVisibility))).toBe(false);
});

test('haptics follow the settings toggle', async () => {
  const Haptics = require('expo-haptics');
  // Haptics default to on (charter section 6): a switch tick fires.
  await hydrateSettings();
  const { getByLabelText } = render(<Shell />);
  fireEvent.press(getByLabelText('LinkedIn'));
  await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalled());

  // With the toggle off, switching stays silent.
  Haptics.impactAsync.mockClear();
  updateSettings({ haptics: false });
  fireEvent.press(getByLabelText('Instagram'));
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

// Instagram My code (stretch S1): a fourth Instagram tab whose panel shows
// the profile QR, the same screen design as the LinkedIn one (charter 14).
describe('Instagram My code', () => {
  test('the QR tab shows the profile QR for the saved username', async () => {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, igUsername: 'denis' }),
    );
    await hydrateSettings();
    const { getByLabelText, getByTestId, getByText } = render(<Shell />);
    fireEvent.press(getByLabelText('QR tab'));
    expect(getByTestId('my-code-qr')).toBeTruthy();
    expect(getByText('https://www.instagram.com/denis/')).toBeTruthy();
    // The panel is an overlay: the host and its WebView stay mounted.
    expect(getByTestId('webview-instagram', anyVisibility)).toBeTruthy();
    expect(isHidden(getByTestId('host-instagram', anyVisibility))).toBe(false);
  });

  test('without a username the panel offers the profile detour', async () => {
    await hydrateSettings();
    const { getByLabelText, getByText } = render(<Shell />);
    fireEvent.press(getByLabelText('QR tab'));
    expect(getByText('No Instagram profile link saved yet.')).toBeTruthy();
    fireEvent.press(getByLabelText('Find my profile'));
    // The detour opens the profile tab, whose page load lets the injected
    // script report the username; the panel returns when it does.
    expect(getByLabelText('Profile tab').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });
});
