// Settings and tab context for the injected script, declared by the native
// side before the main script runs: the WebViewHost prepends this line to
// every inject script. Defaults when absent live in src/inject/protocol.ts;
// the context drives context dependent route rows (Instagram's home rule).

import type { InjectSettings } from './protocol';

export function buildSettingsPreamble(settings: InjectSettings, context?: string, homeUrl?: string | null): string {
  return (
    `window.__UNFEED_SETTINGS__=${JSON.stringify(settings)};` +
    (context ? `window.__UNFEED_CONTEXT__=${JSON.stringify(context)};` : '') +
    // The tab's own start page: where a home or feed redirect returns to
    // when the tab has no earlier page (src/rules/returnRules.ts).
    (homeUrl ? `window.__UNFEED_HOME__=${JSON.stringify(homeUrl)};` : '') +
    'true;'
  );
}
