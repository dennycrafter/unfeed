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

export const SETTINGS_KEY = 'unfeed.settings.v1';
const KEY = SETTINGS_KEY;

/** A change to stored settings. version is managed here, never patched. */
export type SettingsPatch = Partial<Omit<Settings, 'version'>>;

function normalizeOptionalText(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Merges a patch into the current settings field by field, so one screen can
 * change one row without knowing the rest (charter section 6). Unknown or
 * wrong typed values keep the previous field; text fields empty out to null. */
export function applySettingsPatch(previous: Settings, patch: SettingsPatch): Settings {
  return {
    version: 1,
    lastApp: patch.lastApp === 'instagram' || patch.lastApp === 'linkedin' ? patch.lastApp : previous.lastApp,
    igUsername: normalizeOptionalText(patch.igUsername, previous.igUsername),
    liProfileUrl: normalizeOptionalText(patch.liProfileUrl, previous.liProfileUrl),
    allowSharedPosts: typeof patch.allowSharedPosts === 'boolean' ? patch.allowSharedPosts : previous.allowSharedPosts,
    hideCounts: typeof patch.hideCounts === 'boolean' ? patch.hideCounts : previous.hideCounts,
    haptics: typeof patch.haptics === 'boolean' ? patch.haptics : previous.haptics,
  };
}

/** Restores every setting to its default (the settings screen reset row). */
export function resetToDefaults(): Settings {
  return { ...DEFAULT_SETTINGS };
}

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
