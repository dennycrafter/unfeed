// Settings for the injected script, declared by the native side before the
// main script runs: the WebViewHost prepends this line to every inject
// script. Defaults when absent live in src/inject/protocol.ts.

import type { InjectSettings } from './protocol';

export function buildSettingsPreamble(settings: InjectSettings): string {
  return `window.__UNFEED_SETTINGS__=${JSON.stringify(settings)};true;`;
}
