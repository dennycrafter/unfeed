// The bounce log (Denis, 25 Oct 2026): every time a page is redirected or
// blocked, the time, the address and the rule id are kept, newest first, the
// last 20 only. Settings shows them under "Blocked pages", so a screenshot of
// that list says exactly which rule fired. Stored on the phone under its own
// AsyncStorage key, so it survives a restart and never touches the settings.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Site } from '../rules/decide';

export interface BounceEntry {
  /** When it happened, in milliseconds since 1970. */
  at: number;
  site: Site;
  /** The address that was stopped. */
  url: string;
  /** The rules row that decided, for example ig-5-home. */
  rule: string;
  /** Where the page was sent instead, when it was a redirect. */
  to?: string;
}

export const BOUNCE_LOG_KEY = 'unfeed.bounces.v1';
export const BOUNCE_LOG_LIMIT = 20;
/** The native guard and the in-page guard can both report one bounce. */
const SAME_BOUNCE_MS = 3000;

let entries: BounceEntry[] = [];
const listeners = new Set<() => void>();

function set(next: BounceEntry[]): void {
  entries = next;
  for (const listener of listeners) listener();
}

function isEntry(value: unknown): value is BounceEntry {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'number' &&
    (record.site === 'instagram' || record.site === 'linkedin') &&
    typeof record.url === 'string' &&
    typeof record.rule === 'string' &&
    (record.to === undefined || typeof record.to === 'string')
  );
}

export function getBounces(): BounceEntry[] {
  return entries;
}

/** Adds one bounce, newest first. The same address and rule again within a
 * few seconds is the same bounce seen twice, so it is kept once. */
export function recordBounce(entry: BounceEntry): void {
  const repeat = entries.find(
    (existing) =>
      existing.url === entry.url && existing.rule === entry.rule && Math.abs(entry.at - existing.at) < SAME_BOUNCE_MS,
  );
  if (repeat) return;
  const next = [entry, ...entries].slice(0, BOUNCE_LOG_LIMIT);
  set(next);
  AsyncStorage.setItem(BOUNCE_LOG_KEY, JSON.stringify(next)).catch((error: unknown) => {
    console.warn('[unfeed] could not save the bounce log', error);
  });
}

/** Reads the saved log once at launch. Bounces recorded before it finished
 * stay on top. */
export async function hydrateBounces(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(BOUNCE_LOG_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const saved = parsed.filter(isEntry);
    set([...entries, ...saved].sort((a, b) => b.at - a.at).slice(0, BOUNCE_LOG_LIMIT));
  } catch (error) {
    console.warn('[unfeed] could not load the bounce log', error);
  }
}

/** Test helper: forget everything in memory. */
export function resetBouncesForTest(): void {
  set([]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBounces(): BounceEntry[] {
  return useSyncExternalStore(subscribe, getBounces, getBounces);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** "25 Oct 14:03:07" in the phone's own time zone. */
export function formatBounceTime(at: number): string {
  const date = new Date(at);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;
}

/** The address without https:// and www., short enough to read on a phone. */
export function shortBounceUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}
