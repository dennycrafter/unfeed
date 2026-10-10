// Charter T4 acceptance: the duplicate-scan guard ignores the same code for
// 2 seconds, tested with fake timers.

import { createScanGate } from '../../src/qr/scanGate';

describe('createScanGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('accepts the first read of a code', () => {
    jest.setSystemTime(0);
    const gate = createScanGate();
    expect(gate.accept('https://www.linkedin.com/in/ada/')).toBe(true);
  });

  test('ignores the same code inside the 2 second window', () => {
    jest.setSystemTime(0);
    const gate = createScanGate();
    expect(gate.accept('same-code')).toBe(true);
    jest.setSystemTime(1999);
    expect(gate.accept('same-code')).toBe(false);
  });

  test('accepts the same code again after the window', () => {
    jest.setSystemTime(0);
    const gate = createScanGate();
    gate.accept('same-code');
    jest.setSystemTime(2000);
    expect(gate.accept('same-code')).toBe(true);
  });

  test('a different code is accepted immediately', () => {
    jest.setSystemTime(0);
    const gate = createScanGate();
    expect(gate.accept('code-a')).toBe(true);
    jest.setSystemTime(100);
    expect(gate.accept('code-b')).toBe(true);
  });

  test('a different code does not extend the first code window', () => {
    jest.setSystemTime(0);
    const gate = createScanGate();
    gate.accept('code-a');
    jest.setSystemTime(1500);
    gate.accept('code-b');
    jest.setSystemTime(2200);
    expect(gate.accept('code-a')).toBe(true);
  });

  test('never accepts an empty payload', () => {
    const gate = createScanGate();
    expect(gate.accept('')).toBe(false);
  });

  test('honours a custom window', () => {
    jest.setSystemTime(0);
    const gate = createScanGate(500);
    expect(gate.accept('code')).toBe(true);
    jest.setSystemTime(499);
    expect(gate.accept('code')).toBe(false);
    jest.setSystemTime(500);
    expect(gate.accept('code')).toBe(true);
  });
});
