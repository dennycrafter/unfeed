// Shared app state (charter section 4 lists state/store.ts). One module level
// snapshot read through useSyncExternalStore, so the shell and the settings
// screen see the same settings wherever a row changes. Also carries the log
// out request: the settings screen asks, the shell answers by steering the
// right WebView to the site's own logout page, the only cookie clearing Expo
// Go offers (react-native-webview has no cookie API).

import { useSyncExternalStore } from 'react';
import type { Site } from '../rules/decide';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  loadSettings,
  resetToDefaults,
  saveSettings,
  type Settings,
  type SettingsPatch,
} from './settings';

export interface LogoutRequest {
  site: Site;
  /** Grows every time a log out is asked for, so a repeat request still fires. */
  id: number;
}

export interface StoreState {
  settings: Settings;
  /** True once the stored settings were read from AsyncStorage this session. */
  hydrated: boolean;
  logout: LogoutRequest | null;
}

let state: StoreState = { settings: DEFAULT_SETTINGS, hydrated: false, logout: null };
const listeners = new Set<() => void>();

function set(next: StoreState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoreState(): StoreState {
  return state;
}

export async function hydrateSettings(): Promise<void> {
  const settings = await loadSettings();
  set({ ...state, settings, hydrated: true });
}

export function updateSettings(patch: SettingsPatch): Settings {
  const next = applySettingsPatch(state.settings, patch);
  set({ ...state, settings: next });
  void saveSettings(next);
  return next;
}

export function resetSettings(): Settings {
  return updateSettings(resetToDefaults());
}

export function requestSiteLogout(site: Site): void {
  set({ ...state, logout: { site, id: (state.logout?.id ?? 0) + 1 } });
}

export function useStoreState(): StoreState {
  return useSyncExternalStore(subscribeStore, getStoreState, getStoreState);
}

export function useSettings(): Settings {
  return useStoreState().settings;
}
