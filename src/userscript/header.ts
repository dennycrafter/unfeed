// Userscript header metadata, built from the same rules JSON the app and the
// injected scripts use (charter T6: one source of truth, no drift). Pure and
// node safe: scripts/build-inject.ts calls it, the tests hold it to the rules.

import instagramJson from '../rules/instagram.json';
import linkedinJson from '../rules/linkedin.json';
import type { Site } from '../rules/decide';

export const USERSCRIPT_VERSION = '1.8.0';

interface SiteMeta {
  name: string;
  description: string;
}

const META: Record<Site, SiteMeta> = {
  instagram: {
    name: 'Unfeed Instagram',
    description:
      'Instagram with no feed: opens your DMs, hides the home feed, reels and explore pages, and keeps messages, search, profiles and stories.',
  },
  linkedin: {
    name: 'Unfeed LinkedIn',
    description:
      'LinkedIn with no feed: opens your messages, hides the feed and post results, and keeps messages, people search and profiles.',
  },
};

const RULES_JSON: Record<Site, { hosts: string[] }> = {
  instagram: instagramJson,
  linkedin: linkedinJson,
};

/** One @match line per host in the site's rules file, so the userscript can
 * never cover hosts the rules do not know about (and the other way round). */
export function userScriptMatches(site: Site): string[] {
  return RULES_JSON[site].hosts.map((host) => `https://${host}/*`);
}

/** The full `// ==UserScript==` metadata block, ending with the closing
 * marker. Managers parse only @key lines; the block ends at ==/UserScript==. */
export function buildUserScriptHeader(site: Site, version: string = USERSCRIPT_VERSION): string {
  const meta = META[site];
  const lines = [
    '// ==UserScript==',
    `// @name ${meta.name}`,
    `// @namespace https://github.com/dennycrafter/unfeed`,
    `// @version ${version}`,
    `// @description ${meta.description}`,
    ...userScriptMatches(site).map((match) => `// @match ${match}`),
    // Main frames only: a redirect or hide from inside an iframe is never
    // what Denis asked for, and both managers support this key.
    '// @noframes',
    // Page context, not a sandbox: the script needs location.replace and the
    // real DOM, and it uses no manager APIs.
    '// @grant none',
    // Before the page's own scripts: the route hooks must wrap pushState
    // before Instagram or LinkedIn ever call it.
    '// @run-at document-start',
    '// ==/UserScript==',
  ];
  return lines.join('\n');
}

/** Splits a built userscript file into header and body. The body is the
 * bundled inject script for the site, byte for byte (only the whitespace
 * between the marker and the bundle is stripped). Throws when the file
 * has no metadata block, so a mangled build cannot pass silently. */
export function splitUserScript(raw: string): { header: string; body: string } {
  const marker = '// ==/UserScript==';
  const index = raw.indexOf(marker);
  if (index === -1) {
    throw new Error('userscript has no ==/UserScript== marker');
  }
  return {
    header: raw.slice(0, index + marker.length),
    body: raw.slice(index + marker.length).replace(/^\s+/, ''),
  };
}
