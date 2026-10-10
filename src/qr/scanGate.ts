// Duplicate-scan guard (charter section 8.7): cameras report the same code
// many times per second, so the same payload inside a 2 second window is
// ignored. The clock is injectable so tests stay deterministic.

export interface ScanGate {
  accept(code: string): boolean;
}

export function createScanGate(windowMs = 2000, now: () => number = Date.now): ScanGate {
  let lastCode: string | null = null;
  let lastAt = -Infinity;

  return {
    accept(code: string): boolean {
      if (!code) return false;
      const at = now();
      if (code === lastCode && at - lastAt < windowMs) return false;
      lastCode = code;
      lastAt = at;
      return true;
    },
  };
}
