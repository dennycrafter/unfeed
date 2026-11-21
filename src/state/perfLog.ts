// The speed log (Denis, 21 Nov 2026): how long pages take on the phone, so a
// speed change can be shown with numbers before and after. Pages report full
// loads and steps inside the page; the host adds the first open of each tab.
// The last 200 timings are kept on the phone under their own AsyncStorage
// key, and Settings shows the typical (middle) value per app and kind.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Site } from '../rules/decide';

/** tab: a tab tapped until its page shows (0 when it was ready already).
 * open: a tab's web view made until its first page showed.
 * load: a full page load until the first thing showed.
 * move: a step inside the page until it stopped changing. */
export type SpeedKind = 'tab' | 'open' | 'load' | 'move';

export interface SpeedEntry {
  at: number;
  site: Site;
  kind: SpeedKind;
  ms: number;
  url: string;
}

export interface SpeedSummary {
  site: Site;
  kind: SpeedKind;
  /** The middle value, so one very slow page does not skew it. */
  typicalMs: number;
  slowestMs: number;
  count: number;
}

export const SPEED_LOG_KEY = 'unfeed.speed.v1';
export const SPEED_LOG_LIMIT = 200;

const SITES: Site[] = ['instagram', 'linkedin', 'x'];
const KINDS: SpeedKind[] = ['tab', 'open', 'load', 'move'];

let entries: SpeedEntry[] = [];
const listeners = new Set<() => void>();

function set(next: SpeedEntry[]): void {
  entries = next;
  for (const listener of listeners) listener();
}

function save(next: SpeedEntry[]): void {
  AsyncStorage.setItem(SPEED_LOG_KEY, JSON.stringify(next)).catch((error: unknown) => {
    console.warn('[unfeed] could not save the speed log', error);
  });
}

function isEntry(value: unknown): value is SpeedEntry {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'number' &&
    SITES.includes(record.site as Site) &&
    KINDS.includes(record.kind as SpeedKind) &&
    typeof record.ms === 'number' &&
    Number.isFinite(record.ms) &&
    typeof record.url === 'string'
  );
}

export function getSpeedEntries(): SpeedEntry[] {
  return entries;
}

export function recordSpeed(entry: SpeedEntry): void {
  const next = [entry, ...entries].slice(0, SPEED_LOG_LIMIT);
  set(next);
  save(next);
}

export function clearSpeedLog(): void {
  set([]);
  save([]);
}

export async function hydrateSpeedLog(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SPEED_LOG_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const saved = parsed.filter(isEntry);
    set([...entries, ...saved].sort((a, b) => b.at - a.at).slice(0, SPEED_LOG_LIMIT));
  } catch (error) {
    console.warn('[unfeed] could not load the speed log', error);
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** One row per app and kind that has timings, in a fixed order. */
export function summarizeSpeed(list: SpeedEntry[]): SpeedSummary[] {
  const rows: SpeedSummary[] = [];
  for (const site of SITES) {
    for (const kind of KINDS) {
      const values = list.filter((entry) => entry.site === site && entry.kind === kind).map((entry) => entry.ms);
      if (values.length === 0) continue;
      rows.push({ site, kind, typicalMs: median(values), slowestMs: Math.max(...values), count: values.length });
    }
  }
  return rows;
}

/** "0.4 s" or "2.3 s": one decimal is as exact as a phone test gets. */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export const SPEED_KIND_LABELS: Record<SpeedKind, string> = {
  tab: 'Tab ready after tap',
  open: 'First open of a tab',
  load: 'Full page load',
  move: 'Tap inside a page',
};

/** Test helper: forget everything in memory. */
export function resetSpeedLogForTest(): void {
  set([]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSpeedEntries(): SpeedEntry[] {
  return useSyncExternalStore(subscribe, getSpeedEntries, getSpeedEntries);
}
