// Charter T5 acceptance: unit tests for the settings wrapper. Covers the
// defaults when storage is empty or broken, corrupted JSON, payloads from
// other versions, the round trip through AsyncStorage, and every patch rule
// (toggles, invalid lastApp, blank text fields, trimming).

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  type Settings,
} from '../../src/state/settings';

async function seedStored(value: unknown): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
}

async function readStored(): Promise<string | null> {
  return AsyncStorage.getItem(SETTINGS_KEY);
}

describe('loadSettings', () => {
  test('storage empty gives the defaults', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('storage throwing gives the defaults', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage broken'));
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('corrupted JSON gives the defaults', async () => {
    await seedStored('{not json at all');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('a JSON number instead of an object gives the defaults', async () => {
    await seedStored(42);
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('an array instead of an object gives the defaults', async () => {
    await seedStored([1, 2, 3]);
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('version 0 storage is upgraded: saved fields kept, gaps filled', async () => {
    // An older payload without hideCounts and haptics: those are newer
    // settings, so they arrive at their defaults (charter section 6).
    await seedStored({ version: 0, lastApp: 'linkedin', igUsername: 'denis' });
    const loaded = await loadSettings();
    expect(loaded).toEqual({ ...DEFAULT_SETTINGS, version: 1, lastApp: 'linkedin', igUsername: 'denis' });
  });

  test('version 99 storage is normalized down to version 1', async () => {
    await seedStored({ ...DEFAULT_SETTINGS, version: 99 });
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('a fully stored payload loads as written', async () => {
    const stored: Settings = {
      version: 1,
      lastApp: 'linkedin',
      igUsername: 'denis',
      liProfileUrl: 'https://www.linkedin.com/in/denis-popov/',
      allowSharedPosts: false,
      hideCounts: true,
      haptics: false,
    };
    await seedStored(stored);
    await expect(loadSettings()).resolves.toEqual(stored);
  });

  test('missing fields inside a version 1 payload fall back to defaults', async () => {
    await seedStored({ version: 1, lastApp: 'instagram' });
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings round trip', () => {
  test('saved settings read back the same', async () => {
    const toSave: Settings = { ...DEFAULT_SETTINGS, lastApp: 'linkedin', hideCounts: true };
    await saveSettings(toSave);
    await expect(loadSettings()).resolves.toEqual(toSave);
  });

  test('the stored JSON is the settings payload under the one settings key', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, igUsername: 'denis' });
    const raw = await readStored();
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ igUsername: 'denis', version: 1 });
  });

  test('a failed write resolves instead of crashing (charter section 6: catch and keep going)', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
  });
});

describe('applySettingsPatch', () => {
  test('toggles each boolean field on its own', () => {
    let next = applySettingsPatch(DEFAULT_SETTINGS, { allowSharedPosts: false });
    expect(next.allowSharedPosts).toBe(false);
    next = applySettingsPatch(next, { hideCounts: true });
    expect(next.hideCounts).toBe(true);
    next = applySettingsPatch(next, { haptics: false });
    expect(next.haptics).toBe(false);
    expect(next.allowSharedPosts).toBe(false);
    expect(next.hideCounts).toBe(true);
  });

  test('switching lastApp to linkedin is saved', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { lastApp: 'linkedin' }).lastApp).toBe('linkedin');
  });

  test('an unknown lastApp string is ignored', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { lastApp: 'tiktok' as never })).toEqual(DEFAULT_SETTINGS);
  });

  test('a blank username clears the field to null', () => {
    const next = applySettingsPatch({ ...DEFAULT_SETTINGS, igUsername: 'denis' }, { igUsername: '   ' });
    expect(next.igUsername).toBeNull();
  });

  test('an empty profile link clears the field to null', () => {
    const next = applySettingsPatch({ ...DEFAULT_SETTINGS, liProfileUrl: 'https://www.linkedin.com/in/x/' }, { liProfileUrl: '' });
    expect(next.liProfileUrl).toBeNull();
  });

  test('text fields are trimmed', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, { igUsername: '  denis  ' });
    expect(next.igUsername).toBe('denis');
  });

  test('fields left out of the patch keep their values', () => {
    const start: Settings = { ...DEFAULT_SETTINGS, hideCounts: true, lastApp: 'linkedin' };
    expect(applySettingsPatch(start, { haptics: false })).toEqual({ ...start, haptics: false });
  });

  test('a patch never changes the version (version is managed by load and save)', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { haptics: false }).version).toBe(1);
  });
});
