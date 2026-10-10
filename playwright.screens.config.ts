import { defineConfig } from '@playwright/test';

// Screenshots of the web preview at phone size (charter section 10). Build
// first with npm run web, then run npm run test:screens.

export default defineConfig({
  testDir: './tests/screens',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  use: { viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'node scripts/serve-dist.js 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
