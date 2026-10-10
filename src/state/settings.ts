// Local settings (charter section 6). Everything lives on the phone under
// one AsyncStorage key. Reads and writes are wrapped in try/catch with
// defaults on failure; the field by field fallback keeps a partial or
// corrupted write from wedging the app. The full settings screen and its
// test suite arrive in T5.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  version: 1;
  lastApp: 'instagram' | 'linkedin';
  igUsername: string | null;
  liProfileUrl: string | null;
  allowSharedPosts: boolean;
  hideCounts: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  lastApp: 'instagram',
  igUsername: null,
  liProfileUrl: null,
  allowSharedPosts: true,
  hideCounts: false,
  haptics: true,
};

const KEY = 'unfeed.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
    const record = parsed as Record<string, unknown>;
    const boolean = (value: unknown, fallback: boolean): boolean =>
      typeof value === 'boolean' ? value : fallback;
    return {
      version: 1,
      lastApp: record.lastApp === 'linkedin' ? 'linkedin' : 'instagram',
      igUsername: typeof record.igUsername === 'string' ? record.igUsername : null,
      liProfileUrl: typeof record.liProfileUrl === 'string' ? record.liProfileUrl : null,
      allowSharedPosts: boolean(record.allowSharedPosts, DEFAULT_SETTINGS.allowSharedPosts),
      hideCounts: boolean(record.hideCounts, DEFAULT_SETTINGS.hideCounts),
      haptics: boolean(record.haptics, DEFAULT_SETTINGS.haptics),
    };
  } catch (error) {
    console.warn('[unfeed] could not load settings, using defaults', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[unfeed] could not save settings', error);
  }
}
