// Charter T6 acceptance: the userscripts are the injected bundles with a
// metadata block on top. These tests hold the committed files to that shape:
// header built from the rules JSON, body byte identical to the generated
// inject bundle, and the same decide() answers as the native side.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'vm';
import { INSTAGRAM_INJECT_SCRIPT } from '../../src/inject/generated/instagram.generated';
import { LINKEDIN_INJECT_SCRIPT } from '../../src/inject/generated/linkedin.generated';
import instagramJson from '../../src/rules/instagram.json';
import linkedinJson from '../../src/rules/linkedin.json';
import { decide, type Site } from '../../src/rules/decide';
import {
  buildUserScriptHeader,
  splitUserScript,
  userScriptMatches,
  USERSCRIPT_VERSION,
} from '../../src/userscript/header';
import { INSTAGRAM_DECIDE_TABLE } from './instagram-table';
import { LINKEDIN_DECIDE_TABLE } from './linkedin-table';

function scriptPath(site: Site): string {
  return join(process.cwd(), 'userscripts', `unfeed-${site}.user.js`);
}

function readScript(site: Site): string {
  return readFileSync(scriptPath(site), 'utf8');
}

const BUNDLES: Record<Site, string> = {
  instagram: INSTAGRAM_INJECT_SCRIPT,
  linkedin: LINKEDIN_INJECT_SCRIPT,
};

const RULES_JSON: Record<Site, { hosts: string[] }> = {
  instagram: instagramJson,
  linkedin: linkedinJson,
};

const DECIDE_TABLES: Record<Site, typeof INSTAGRAM_DECIDE_TABLE> = {
  instagram: INSTAGRAM_DECIDE_TABLE,
  linkedin: LINKEDIN_DECIDE_TABLE,
};

const SITES: Site[] = ['instagram', 'linkedin'];

describe('userscript header', () => {
  test.each(SITES)('%s: header opens with the metadata block', (site) => {
    const header = buildUserScriptHeader(site);
    expect(header.startsWith('// ==UserScript==')).toBe(true);
    expect(header.endsWith('// ==/UserScript==')).toBe(true);
    expect(header).toContain(`// @name Unfeed ${site === 'instagram' ? 'Instagram' : 'LinkedIn'}`);
    expect(header).toContain(`// @version ${USERSCRIPT_VERSION}`);
  });

  test.each(SITES)('%s: one @match per rules host, no others', (site) => {
    const matches = userScriptMatches(site);
    const hosts = RULES_JSON[site].hosts;
    expect(matches).toEqual(hosts.map((host) => `https://${host}/*`));
    // The two @match lines the charter names are always present.
    const charterRequired: Record<Site, string> = {
      instagram: 'https://www.instagram.com/*',
      linkedin: 'https://www.linkedin.com/*',
    };
    expect(matches).toContain(charterRequired[site]);
  });

  test.each(SITES)('%s: header pins run-at, grant and noframes', (site) => {
    const header = buildUserScriptHeader(site);
    expect(header).toContain('// @run-at document-start');
    expect(header).toContain('// @grant none');
    expect(header).toContain('// @noframes');
  });

  test('splitUserScript separates header and body and throws without a marker', () => {
    const raw = `${buildUserScriptHeader('instagram')}\n\n(() => {})();\n`;
    const { header, body } = splitUserScript(raw);
    expect(header.endsWith('// ==/UserScript==')).toBe(true);
    // Leading whitespace between marker and body goes; the body's own bytes
    // (including a trailing newline) are preserved.
    expect(body).toBe('(() => {})();\n');
    expect(() => splitUserScript('no header here')).toThrow('==/UserScript==');
  });
});

describe('committed userscript files', () => {
  test.each(SITES)('%s: file exists, starts with the header, body is the generated bundle', (site) => {
    const { header, body } = splitUserScript(readScript(site));
    expect(header).toBe(buildUserScriptHeader(site));
    // Byte identity is the strongest parity there is: the userscript and the
    // app carry the same decide() table, the same hide CSS and the same
    // sweeps from one build step.
    expect(body).toBe(BUNDLES[site]);
  });

  test.each(SITES)('%s: header in the file matches one @match per rules host', (site) => {
    const { header } = splitUserScript(readScript(site));
    for (const match of userScriptMatches(site)) {
      expect(header).toContain(`// @match ${match}`);
    }
  });
});

// The userscript runs with no native side and no preamble, so the decisions
// the browser copy makes must equal the native ones for the full tables.
function exposeInVm(body: string): unknown {
  const sandbox: Record<string, unknown> = { URL, URLSearchParams, console };
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox);
  return sandbox.__UNFEED__;
}

describe('userscript matcher parity', () => {
  test.each(SITES)('%s: userscript decide matches native decide over the full table', (site) => {
    const { body } = splitUserScript(readScript(site));
    const exposed = exposeInVm(body) as { decide: typeof decide } | undefined;
    expect(exposed?.decide).toBeDefined();
    for (const row of DECIDE_TABLES[site]) {
      const context = row.context ?? (site === 'instagram' ? 'dms' : 'messages');
      const settings = { allowSharedPosts: row.allowSharedPosts ?? true };
      const native = decide(site, row.url, context, settings);
      expect(exposed?.decide(site, row.url, context, settings)).toEqual(native);
    }
  });
});
