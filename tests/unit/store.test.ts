// Charter T5 acceptance: the shared settings store. Hydration reads storage
// once, updates merge and persist, reset goes back to defaults, and logout
// requests carry an increasing id so repeated requests are each handled once.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoreState,
  hydrateSettings,
  resetSettings,
  requestSiteLogout,
  subscribeStore,
  updateSettings,
} from '../../src/state/store';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../../src/state/settings';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('hydrateSettings loads stored settings and flips hydrated on', async () => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, lastApp: 'linkedin', hideCounts: true }),
  );
  await hydrateSettings();
  const state = getStoreState();
  expect(state.hydrated).toBe(true);
  expect(state.settings.lastApp).toBe('linkedin');
  expect(state.settings.hideCounts).toBe(true);
});

test('hydrateSettings on empty storage gives defaults and still hydrates', async () => {
  await hydrateSettings();
  const state = getStoreState();
  expect(state.hydrated).toBe(true);
  expect(state.settings).toEqual(DEFAULT_SETTINGS);
});

test('updateSettings merges, persists, and notifies subscribers', async () => {
  await hydrateSettings();
  const seen: ReturnType<typeof getStoreState>[] = [];
  const unsubscribe = subscribeStore(() => seen.push(getStoreState()));
  updateSettings({ allowSharedPosts: false, lastApp: 'linkedin' });
  unsubscribe();
  expect(seen.length).toBe(1);
  expect(seen[0].settings.allowSharedPosts).toBe(false);
  expect(seen[0].settings.lastApp).toBe('linkedin');
  expect(seen[0].settings.haptics).toBe(DEFAULT_SETTINGS.haptics);
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  expect(JSON.parse(raw ?? '{}')).toMatchObject({ allowSharedPosts: false, lastApp: 'linkedin' });
});

test('resetSettings restores the defaults and persists them', async () => {
  await hydrateSettings();
  updateSettings({ lastApp: 'linkedin', hideCounts: true, igUsername: 'denis' });
  resetSettings();
  expect(getStoreState().settings).toEqual(DEFAULT_SETTINGS);
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  expect(JSON.parse(raw ?? '{}')).toEqual({ ...DEFAULT_SETTINGS });
});

test('requestSiteLogout carries an increasing id and notifies', async () => {
  await hydrateSettings();
  const seen: string[] = [];
  const unsubscribe = subscribeStore(() => seen.push(getStoreState().logout?.site ?? 'none'));
  requestSiteLogout('instagram');
  const first = getStoreState().logout;
  expect(first?.site).toBe('instagram');
  requestSiteLogout('linkedin');
  const second = getStoreState().logout;
  unsubscribe();
  expect(second?.site).toBe('linkedin');
  expect(second?.id).toBeGreaterThan(first?.id ?? 0);
  expect(seen).toEqual(['instagram', 'linkedin']);
});

test('subscribers can unsubscribe and stop receiving updates', async () => {
  await hydrateSettings();
  let calls = 0;
  const unsubscribe = subscribeStore(() => {
    calls += 1;
  });
  unsubscribe();
  updateSettings({ haptics: false });
  expect(calls).toBe(0);
});
