// The one shared route matcher (charter section 8.3). The native WebViewHost
// and the injected script are both built from this file, and the parity test
// holds them to identical answers.

import instagramJson from './instagram.json';
import linkedinJson from './linkedin.json';

export type Site = 'instagram' | 'linkedin';
export type RouteAction = 'allow' | 'redirect' | 'external';

export interface DecideResult {
  action: RouteAction;
  /** Redirect target as a path, present when action is 'redirect'. */
  to?: string;
  /** Id of the rules row that decided, for debugging and hide-health screens. */
  rule?: string;
}

export interface DecideSettings {
  allowSharedPosts: boolean;
}

const MATCH_KINDS = ['prefix', 'home', 'singleSegmentPrefix', 'username', 'any'] as const;
type MatchKind = (typeof MATCH_KINDS)[number];

const RULE_ACTIONS = ['allow', 'redirect', 'allowIfSharedPosts'] as const;
type RuleAction = (typeof RULE_ACTIONS)[number];

interface RuleMatch {
  kind: MatchKind;
  paths?: string[];
  prefixes?: string[];
  context?: string;
}

interface RouteRule {
  id: string;
  match: RuleMatch;
  action: RuleAction;
  to?: string;
}

interface HostPathRule {
  host: string;
  path: string;
}

interface SiteRules {
  site: Site;
  hosts: string[];
  allowedHostSuffixes: string[];
  allowedHostPaths: HostPathRule[];
  rules: RouteRule[];
}

function fail(site: Site, problem: string): never {
  throw new Error(`Invalid rules for ${site}: ${problem}`);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Lower case, query and hash stripped, trailing slash added (section 8.3). */
export function normalizePath(pathname: string): string {
  let path = pathname.toLowerCase();
  const query = path.indexOf('?');
  if (query !== -1) path = path.slice(0, query);
  const hash = path.indexOf('#');
  if (hash !== -1) path = path.slice(0, hash);
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path = `${path}/`;
  return path;
}

function hostMatches(host: string, pattern: string): boolean {
  return host === pattern || host.endsWith(`.${pattern}`);
}

function ruleMatches(rule: RouteRule, path: string, context: string): boolean {
  switch (rule.match.kind) {
    case 'prefix':
      return (rule.match.paths ?? []).some((prefix) => path.startsWith(prefix));
    case 'home':
      return path === '/' && (rule.match.context === undefined || context === rule.match.context);
    case 'singleSegmentPrefix':
      return (rule.match.prefixes ?? []).some((prefix) => {
        if (!path.startsWith(prefix)) return false;
        const rest = path.slice(prefix.length);
        return rest.length > 0 && !rest.slice(0, -1).includes('/');
      });
    case 'username':
      // By this point every reserved prefix has matched an earlier rule, so
      // anything left is a profile path or an unknown page; both are allowed.
      return path !== '/';
    case 'any':
      return true;
  }
}

function parseSiteRules(raw: unknown, site: Site): SiteRules {
  if (typeof raw !== 'object' || raw === null) fail(site, 'file must be an object');
  const file = raw as Record<string, unknown>;
  if (file.site !== site) fail(site, `file declares site "${String(file.site)}"`);
  if (!isStringArray(file.hosts) || file.hosts.length === 0) {
    fail(site, 'hosts must be a non-empty list of strings');
  }
  const allowedHostSuffixes = file.allowedHostSuffixes === undefined ? [] : file.allowedHostSuffixes;
  if (!isStringArray(allowedHostSuffixes)) fail(site, 'allowedHostSuffixes must be a list of strings');

  const allowedHostPaths: HostPathRule[] = [];
  if (file.allowedHostPaths !== undefined) {
    if (!Array.isArray(file.allowedHostPaths)) fail(site, 'allowedHostPaths must be a list');
    for (const entry of file.allowedHostPaths) {
      if (typeof entry !== 'object' || entry === null) fail(site, 'allowedHostPaths entries must be objects');
      const record = entry as Record<string, unknown>;
      if (typeof record.host !== 'string' || typeof record.path !== 'string') {
        fail(site, 'allowedHostPaths entries need host and path strings');
      }
      allowedHostPaths.push({ host: record.host.toLowerCase(), path: normalizePath(record.path) });
    }
  }

  if (!Array.isArray(file.rules) || file.rules.length === 0) fail(site, 'rules must be a non-empty list');
  const rules: RouteRule[] = file.rules.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) fail(site, `rule ${index} must be an object`);
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string') fail(site, `rule ${index} needs an id string`);
    const id = record.id;
    if (typeof record.match !== 'object' || record.match === null) fail(site, `rule ${id} needs a match object`);
    const match = record.match as Record<string, unknown>;
    if (typeof match.kind !== 'string' || !MATCH_KINDS.includes(match.kind as MatchKind)) {
      fail(site, `rule ${id} has unknown match kind "${String(match.kind)}"`);
    }
    if (match.paths !== undefined && !isStringArray(match.paths)) fail(site, `rule ${id} paths must be strings`);
    if (match.prefixes !== undefined && !isStringArray(match.prefixes)) fail(site, `rule ${id} prefixes must be strings`);
    if (match.context !== undefined && typeof match.context !== 'string') {
      fail(site, `rule ${id} context must be a string`);
    }
    if (typeof record.action !== 'string' || !RULE_ACTIONS.includes(record.action as RuleAction)) {
      fail(site, `rule ${id} has unknown action "${String(record.action)}"`);
    }
    const action = record.action as RuleAction;
    let to: string | undefined;
    if (action === 'redirect' || action === 'allowIfSharedPosts') {
      if (typeof record.to !== 'string' || !record.to.startsWith('/')) {
        fail(site, `rule ${id} action ${action} needs a to path starting with /`);
      }
      to = record.to;
    }
    return {
      id,
      match: { kind: match.kind as MatchKind, paths: match.paths, prefixes: match.prefixes, context: match.context },
      action,
      to,
    };
  });
  if (!rules.some((rule) => rule.match.kind === 'any')) fail(site, 'rules must include an any fallback');

  return {
    site,
    hosts: (file.hosts as string[]).map((host) => host.toLowerCase()),
    allowedHostSuffixes: (allowedHostSuffixes as string[]).map((suffix) => suffix.toLowerCase()),
    allowedHostPaths,
    rules,
  };
}

export const SITE_ORIGINS: Record<Site, string> = {
  instagram: 'https://www.instagram.com',
  linkedin: 'https://www.linkedin.com',
};

/** Redirect targets are paths; the host resolves against the site origin. */
export function toAbsoluteUrl(site: Site, path: string): string {
  return SITE_ORIGINS[site] + path;
}

const RULES: Record<Site, SiteRules> = {
  instagram: parseSiteRules(instagramJson, 'instagram'),
  linkedin: parseSiteRules(linkedinJson, 'linkedin'),
};

export function decide(site: Site, rawUrl: string, context: string, settings: DecideSettings): DecideResult {
  const rules = RULES[site];
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { action: 'external', rule: 'unparseable-url' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    // Let the WebView and the OS handle about:, blob:, data: and intent:.
    return { action: 'allow', rule: 'non-http-scheme' };
  }
  const host = url.hostname.toLowerCase();
  const path = normalizePath(url.pathname);
  if (!rules.hosts.includes(host)) {
    if (rules.allowedHostSuffixes.some((suffix) => hostMatches(host, suffix))) {
      return { action: 'allow', rule: 'asset-host' };
    }
    for (const entry of rules.allowedHostPaths) {
      if (hostMatches(host, entry.host) && path.startsWith(entry.path)) {
        return { action: 'allow', rule: 'host-path' };
      }
    }
    return { action: 'external', rule: 'outside-host' };
  }
  for (const rule of rules.rules) {
    if (!ruleMatches(rule, path, context)) continue;
    if (rule.action === 'allow') return { action: 'allow', rule: rule.id };
    if (rule.action === 'redirect') return { action: 'redirect', to: rule.to, rule: rule.id };
    return settings.allowSharedPosts
      ? { action: 'allow', rule: rule.id }
      : { action: 'redirect', to: rule.to, rule: rule.id };
  }
  // parseSiteRules guarantees an any fallback row; this stays as a guard so a
  // bad rules file can never wedge navigation.
  return { action: 'allow', rule: 'unmatched-fallback' };
}
