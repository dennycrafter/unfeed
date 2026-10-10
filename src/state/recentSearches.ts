// Recent LinkedIn people searches (charter section 8.6): the last 10, newest
// first, stored on the phone. The list logic is pure so it is testable
// without storage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECENT_SEARCHES_LIMIT = 10;

const KEY = 'unfeed.linkedin.recentSearches.v1';

/** Pure: adds a query to the front, deduplicates, trims and caps the list. */
export function nextRecentSearches(current: string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return current;
  return [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, RECENT_SEARCHES_LIMIT);
}

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_SEARCHES_LIMIT);
  } catch (error) {
    console.warn('[unfeed] could not load recent searches', error);
    return [];
  }
}

export async function saveRecentSearches(recent: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(recent.slice(0, RECENT_SEARCHES_LIMIT)));
  } catch (error) {
    console.warn('[unfeed] could not save recent searches', error);
  }
}
