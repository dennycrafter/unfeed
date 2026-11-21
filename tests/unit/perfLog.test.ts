// The speed log behind Settings > Speed (Denis, 21 Nov 2026): timings kept
// newest first, saved on the phone, summarised as the typical (middle) value.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SPEED_LOG_KEY,
  SPEED_LOG_LIMIT,
  clearSpeedLog,
  formatSeconds,
  getSpeedEntries,
  hydrateSpeedLog,
  recordSpeed,
  resetSpeedLogForTest,
  summarizeSpeed,
} from '../../src/state/perfLog';
import { parsePageMessage } from '../../src/inject/protocol';

const url = 'https://www.instagram.com/direct/inbox/';

beforeEach(async () => {
  resetSpeedLogForTest();
  await AsyncStorage.clear();
});

test('the summary shows the middle value, the slowest and the count per app and kind', () => {
  for (const ms of [900, 400, 5000]) recordSpeed({ at: 1, site: 'instagram', kind: 'load', ms, url });
  recordSpeed({ at: 2, site: 'linkedin', kind: 'move', ms: 300, url });
  recordSpeed({ at: 3, site: 'linkedin', kind: 'move', ms: 500, url });
  expect(summarizeSpeed(getSpeedEntries())).toEqual([
    { site: 'instagram', kind: 'load', typicalMs: 900, slowestMs: 5000, count: 3 },
    { site: 'linkedin', kind: 'move', typicalMs: 400, slowestMs: 500, count: 2 },
  ]);
});

test('only the last timings are kept, and they survive a restart', async () => {
  for (let index = 0; index < SPEED_LOG_LIMIT + 5; index += 1) {
    recordSpeed({ at: index, site: 'linkedin', kind: 'open', ms: index, url });
  }
  expect(getSpeedEntries()).toHaveLength(SPEED_LOG_LIMIT);
  await new Promise((resolve) => setTimeout(resolve, 0));
  resetSpeedLogForTest();
  await hydrateSpeedLog();
  expect(getSpeedEntries()).toHaveLength(SPEED_LOG_LIMIT);
  expect(getSpeedEntries()[0].ms).toBe(SPEED_LOG_LIMIT + 4);
});

test('clearing empties the list on the phone too', async () => {
  recordSpeed({ at: 1, site: 'instagram', kind: 'move', ms: 200, url });
  clearSpeedLog();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(getSpeedEntries()).toEqual([]);
  expect(JSON.parse((await AsyncStorage.getItem(SPEED_LOG_KEY)) ?? 'null')).toEqual([]);
});

test('seconds read with one decimal', () => {
  expect(formatSeconds(2349)).toBe('2.3 s');
  expect(formatSeconds(80)).toBe('0.1 s');
});

test('the page message is accepted only when well formed', () => {
  expect(parsePageMessage(JSON.stringify({ type: 'perf', kind: 'load', url, ms: 812 }))).toEqual({
    type: 'perf',
    kind: 'load',
    url,
    ms: 812,
  });
  expect(parsePageMessage(JSON.stringify({ type: 'perf', kind: 'open', url, ms: 812 }))).toBeNull();
  expect(parsePageMessage(JSON.stringify({ type: 'perf', kind: 'move', url, ms: -1 }))).toBeNull();
});
