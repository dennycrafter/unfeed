import { defineConfig } from '@playwright/test';

// Browser tests for the generated injection scripts (fixture pages arrive in
// T2). The smoke spec proves the committed bundle parses and runs in a real
// browser and exposes the shared matcher.

export default defineConfig({
  testDir: './tests/inject',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  use: { viewport: { width: 390, height: 844 } },
});
