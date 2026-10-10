import { defineConfig } from '@playwright/test';

// Web preview runs at phone width 390x844, matching the screenshot rules.
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    viewport: { width: 390, height: 844 },
  },
});
