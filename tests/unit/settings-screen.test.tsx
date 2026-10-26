// Charter T5 acceptance, settings screen side: toggles save straight away,
// the reset flow restores defaults after its confirmation, and the logout
// flow raises the request the shell acts on. All through the real store with
// a mocked AsyncStorage.

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../../src/app/settings';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../../src/state/settings';
import { getStoreState, hydrateSettings } from '../../src/state/store';

async function storedSettings(): Promise<Record<string, unknown>> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return JSON.parse(raw ?? '{}') as Record<string, unknown>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('all settings rows render with their values', async () => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, igUsername: 'denis' }),
  );
  await hydrateSettings();
  const { getByText, getByDisplayValue, queryByText } = await render(<SettingsScreen />);
  expect(getByText('Instagram username')).toBeTruthy();
  expect(getByText('LinkedIn profile link')).toBeTruthy();
  // Single posts always open now, so the shared posts switch is gone.
  expect(queryByText("Open friends' shared posts")).toBeNull();
  expect(getByText('Hide like and follower counts')).toBeTruthy();
  expect(getByText('Haptics')).toBeTruthy();
  expect(getByText('Reset to defaults')).toBeTruthy();
  expect(getByText(/About Unfeed/)).toBeTruthy();
  expect(getByDisplayValue('denis')).toBeTruthy();
});

test('toggling a switch saves the change at once', async () => {
  await hydrateSettings();
  const { getByLabelText } = await render(<SettingsScreen />);
  await fireEvent(getByLabelText('Hide like and follower counts'), 'valueChange', true);
  await waitFor(async () => expect((await storedSettings()).hideCounts).toBe(true));
  expect(getStoreState().settings.hideCounts).toBe(true);
});

test('the reset flow restores the defaults after confirmation', async () => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, hideCounts: true, haptics: false, lastApp: 'linkedin' }),
  );
  await hydrateSettings();
  const { getByLabelText, getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('Reset to defaults'));
  // The dialog is open: its body text is on screen and the plain Reset
  // button (exact label) is now pressable.
  expect(getByText('Every setting goes back to how it started. Your logins are not touched.')).toBeTruthy();
  await fireEvent.press(getByLabelText('Reset', { exact: true }));
  await waitFor(async () => expect((await storedSettings()).haptics).toBe(DEFAULT_SETTINGS.haptics));
  expect(getStoreState().settings).toEqual(DEFAULT_SETTINGS);
  expect(getByText('Settings back to defaults.')).toBeTruthy();
});

test('logging out asks first and then raises the request', async () => {
  await hydrateSettings();
  const { getByLabelText, getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('Log out of Instagram'));
  expect(getByText('The app signs this account out here. You can log back in with your username and password.')).toBeTruthy();
  await fireEvent.press(getByLabelText('Log out', { exact: true }));
  await waitFor(() => expect(getStoreState().logout?.site).toBe('instagram'));
  expect(getByText('Signing out of Instagram. Log back in with your username and password.')).toBeTruthy();
});

// Blocked pages (Denis, 25 Oct 2026): the bounce log at the bottom.
test('Blocked pages says nothing was blocked yet when the log is empty', async () => {
  const { resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  await hydrateSettings();
  const { getByText } = await render(<SettingsScreen />);
  expect(getByText('Blocked pages')).toBeTruthy();
  expect(getByText('Nothing blocked yet.')).toBeTruthy();
});

test('Blocked pages lists the time, the address and the rule, newest first', async () => {
  const { recordBounce, resetBouncesForTest } = require('../../src/state/bounceLog') as typeof import('../../src/state/bounceLog');
  resetBouncesForTest();
  const at = new Date(2026, 9, 25, 9, 5, 1).getTime();
  recordBounce({ at, site: 'instagram', url: 'https://www.instagram.com/', rule: 'ig-5-home', to: '/direct/inbox/' });
  recordBounce({ at: at + 120000, site: 'linkedin', url: 'https://www.linkedin.com/feed/', rule: 'li-9-feed', to: '/messaging/' });
  await hydrateSettings();
  const { getByText, getAllByText, queryByText } = await render(<SettingsScreen />);
  expect(queryByText('Nothing blocked yet.')).toBeNull();
  expect(getByText('25 Oct 09:05:01, Instagram')).toBeTruthy();
  expect(getByText('25 Oct 09:07:01, LinkedIn')).toBeTruthy();
  expect(getByText('linkedin.com/feed/')).toBeTruthy();
  expect(getByText('Rule ig-5-home, sent to /direct/inbox/')).toBeTruthy();
  const rows = getAllByText(/^Rule /).map((node) => String(node.props.children));
  expect(rows[0]).toContain('li-9-feed');
});
