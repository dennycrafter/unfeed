// ==UserScript==
// @name Unfeed Instagram
// @namespace https://github.com/dennycrafter/unfeed
// @version 1.7.0
// @description Instagram with no feed: opens your DMs, hides the home feed, reels and explore pages, and keeps messages, search, profiles and stories.
// @match https://instagram.com/*
// @match https://www.instagram.com/*
// @match https://m.instagram.com/*
// @noframes
// @grant none
// @run-at document-start
// ==/UserScript==

"use strict";
(() => {
  // src/inject/css/instagram.css
  var instagram_default = `/*
  Unfeed hide rules for Instagram (charter section 8.4).

  Every selector uses stable hooks only: href, aria-label, role and element
  structure. Instagram rotates hashed class names weekly, so they are never
  referenced here; the fixtures carry fake hashed classes to prove it.

  Rules are named with marker comments parsed by src/inject/cssRules.ts:
      @unfeed-rule <id> [scope=token,tokens] -- Title
  Scope tokens come from src/inject/scopes.ts. A rule with no scope always
  applies. The counts scope applies only while the hideCounts setting is on.
*/

/* @unfeed-rule ig-own-nav -- Instagram's own bottom navigation and top header, replaced by the native bars */
nav:has(a[href="/explore/"]),
nav:has(a[href="/reels/"]),
header:has(svg[aria-label="Instagram"]),
a[href="/"]:has(svg[aria-label="Instagram"]) {
  display: none !important;
}

/* @unfeed-rule ig-feed-links -- links to the Reels tab or Explore, including inside DM threads. A single reel a friend sends stays (Denis, 25 Oct 2026) */
a[href="/reels/"],
a[href="/reels"],
a[href^="/explore/"] {
  display: none !important;
}

/* @unfeed-rule ig-explore-grid scope=explore-search -- the image grid below the search input */
main a[href^="/p/"],
main a[href^="/reel/"],
main a[href^="/tv/"] {
  display: none !important;
}

/* @unfeed-rule ig-home-feed scope=home -- the home page never paints at all (Denis, 25 Oct 2026). It only loads in the hidden stories tray reader, which reads the tray from the page without showing it; anywhere else home is redirected away, and this keeps even that moment blank */
html,
html * {
  visibility: hidden !important;
}
html,
body {
  overflow: hidden !important;
  background: #0b0b0d !important;
}
article,
section:has(a[href^="/explore/people/"]),
div:has(> a[href^="/explore/people/"]) {
  display: none !important;
}

/* @unfeed-rule ig-post-related scope=post-page -- More posts from, Suggested and related sections on permalinks */
main > :not(:first-child),
section:has(a[href^="/explore/people/"]) {
  display: none !important;
}

/* @unfeed-rule ig-app-banners -- Open app and Use the app banners */
:is(div, aside, section, header):has(> a[href^="instagram://"]),
:is(div, aside, section, header):has(> a[href^="https://apps.apple.com"]),
:is(div, aside, section, header):has(> a[href^="https://play.google.com"]),
a[href^="instagram://"] {
  display: none !important;
}

/* @unfeed-rule ig-swept -- anything a sweep in src/inject/instagram.ts decided to hide (own bars, app banners) */
[data-unfeed-hidden] {
  display: none !important;
}

/* @unfeed-rule ig-counts scope=counts -- like, view and follower counts, only when the hideCounts setting is on */
a[href$="/liked-by/"],
a[href$="/followers/"],
a[href$="/following/"] {
  visibility: hidden !important;
}

/* @unfeed-rule ig-theme -- Unfeed's colours and font on the page (Denis, 25 Oct 2026). Only the site's own colour variables are set, so nothing can end up dark on dark if Instagram renames them; it then keeps its own dark mode */
:root {
  color-scheme: dark !important;
  --ig-primary-background: 11, 11, 13 !important;
  --ig-secondary-background: 18, 18, 21 !important;
  --ig-elevated-background: 28, 28, 32 !important;
  --ig-highlight-background: 28, 28, 32 !important;
  --ig-banner-background: 18, 18, 21 !important;
  --ig-primary-text: 242, 242, 244 !important;
  --ig-secondary-text: 154, 154, 163 !important;
  --ig-tertiary-text: 154, 154, 163 !important;
  --ig-primary-icon: 242, 242, 244 !important;
  --ig-secondary-icon: 154, 154, 163 !important;
  --ig-separator: 42, 42, 48 !important;
  --ig-elevated-separator: 42, 42, 48 !important;
  --ig-stroke: 42, 42, 48 !important;
}
body,
button,
input,
textarea {
  font-family: -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif !important;
}
`;

  // src/inject/cssRules.ts
  var RULE_MARKER = /\/\*\s*@unfeed-rule\s+([A-Za-z0-9_-]+)\s+([^*]*)\*\//g;
  function splitSelectorList(selectorText) {
    const selectors = [];
    let depth = 0;
    let current = "";
    for (const char of selectorText) {
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      if (char === "," && depth === 0) {
        selectors.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) selectors.push(current.trim());
    return selectors.filter(Boolean);
  }
  function splitBlocks(css) {
    const blocks = [];
    let index = 0;
    while (index < css.length) {
      const open = css.indexOf("{", index);
      if (open === -1) break;
      const close = css.indexOf("}", open);
      if (close === -1) break;
      const selectorText = css.slice(index, open).trim();
      const body = css.slice(open + 1, close).trim();
      if (selectorText) {
        blocks.push({ selectors: splitSelectorList(selectorText), body });
      }
      index = close + 1;
    }
    return blocks;
  }
  function parseNamedCss(css) {
    var _a, _b;
    const rules2 = [];
    const markers = [...css.matchAll(RULE_MARKER)];
    for (let i = 0; i < markers.length; i += 1) {
      const marker = markers[i];
      const meta = marker[2].trim();
      const dash = meta.indexOf("--");
      const optionText = dash === -1 ? meta : meta.slice(0, dash).trim();
      const title = dash === -1 ? meta : meta.slice(dash + 2).trim();
      let scopes = [];
      const scopeMatch = /(?:^|\s)scope=([\w,-]+)/.exec(optionText);
      if (scopeMatch) {
        scopes = scopeMatch[1].split(",").map((token) => token.trim()).filter(Boolean);
      }
      const bodyStart = ((_a = marker.index) != null ? _a : 0) + marker[0].length;
      const bodyEnd = i + 1 < markers.length ? (_b = markers[i + 1].index) != null ? _b : css.length : css.length;
      rules2.push({ id: marker[1], title, scopes, blocks: splitBlocks(css.slice(bodyStart, bodyEnd)) });
    }
    return rules2;
  }
  function ruleCss(rule) {
    return rule.blocks.map((block) => `${block.selectors.join(", ")} { ${block.body} }`).join("\n");
  }
  function ruleSelectors(rule) {
    return rule.blocks.flatMap((block) => block.selectors);
  }

  // src/rules/instagram.json
  var instagram_default2 = {
    site: "instagram",
    hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
    allowedHostSuffixes: ["cdninstagram.com", "fbcdn.net"],
    allowedHostPaths: [
      { host: "facebook.com", path: "/login" },
      { host: "accountscenter.instagram.com", path: "/" }
    ],
    rules: [
      {
        id: "ig-1-auth",
        match: { kind: "prefix", paths: ["/accounts/", "/challenge/", "/consent/", "/privacy/", "/legal/"] },
        action: "allow"
      },
      { id: "ig-2-direct", match: { kind: "prefix", paths: ["/direct/"] }, action: "allow" },
      { id: "ig-3-stories", match: { kind: "prefix", paths: ["/stories/"] }, action: "allow" },
      { id: "ig-4-home-stories-tray", match: { kind: "home", context: "stories-tray" }, action: "allow" },
      { id: "ig-5-home", match: { kind: "home" }, action: "redirect", to: "/direct/inbox/" },
      { id: "ig-6-explore-search", match: { kind: "prefix", paths: ["/explore/search/"] }, action: "allow" },
      { id: "ig-7-explore", match: { kind: "prefix", paths: ["/explore/"] }, action: "redirect", to: "/explore/search/" },
      {
        id: "ig-8-single-reel",
        match: { kind: "singleSegmentPrefix", prefixes: ["/reels/"] },
        action: "redirect",
        to: "/reel/",
        keepRest: true
      },
      { id: "ig-8-reels", match: { kind: "prefix", paths: ["/reels/"] }, action: "redirect", to: "/direct/inbox/" },
      { id: "ig-9-single-post", match: { kind: "singleSegmentPrefix", prefixes: ["/reel/", "/p/", "/tv/"] }, action: "allow" },
      { id: "ig-10-profile", match: { kind: "username" }, action: "allow" },
      { id: "ig-11-fallback", match: { kind: "any" }, action: "allow" }
    ]
  };

  // src/rules/linkedin.json
  var linkedin_default = {
    site: "linkedin",
    hosts: ["linkedin.com", "www.linkedin.com"],
    allowedHostSuffixes: ["licdn.com"],
    allowedHostPaths: [],
    alwaysAllowHosts: ["lnkd.in"],
    rules: [
      {
        id: "li-1-auth",
        match: { kind: "prefix", paths: ["/login", "/checkpoint/", "/uas/", "/authwall", "/signup", "/psettings/", "/mypreferences/"] },
        action: "allow"
      },
      { id: "li-2-messaging", match: { kind: "prefix", paths: ["/messaging/"] }, action: "allow" },
      { id: "li-3-entities", match: { kind: "prefix", paths: ["/in/", "/company/", "/school/"] }, action: "allow" },
      {
        id: "li-4-search-people",
        match: { kind: "prefix", paths: ["/search/results/people/", "/search/results/companies/", "/search/results/all/"] },
        action: "allow"
      },
      {
        id: "li-5-search-content",
        match: { kind: "prefix", paths: ["/search/results/content/"] },
        action: "redirect",
        to: "/search/results/people/",
        keepQuery: ["keywords"]
      },
      { id: "li-6-invitation-manager", match: { kind: "prefix", paths: ["/mynetwork/invitation-manager/"] }, action: "allow" },
      { id: "li-7-mynetwork", match: { kind: "prefix", paths: ["/mynetwork/"] }, action: "allow" },
      {
        id: "li-8-composer",
        match: { kind: "prefix", paths: ["/feed/"], query: ["shareActive"] },
        action: "allow"
      },
      {
        id: "li-8-composer-session",
        match: { kind: "exact", paths: ["/feed/"], context: "composer" },
        action: "allow"
      },
      { id: "li-8-single-post", match: { kind: "prefix", paths: ["/feed/update/", "/posts/"] }, action: "allow" },
      { id: "li-9-feed", match: { kind: "prefix", paths: ["/feed/"] }, action: "redirect", to: "/messaging/" },
      { id: "li-9-home", match: { kind: "home" }, action: "redirect", to: "/messaging/" },
      {
        id: "li-10-distractions",
        match: { kind: "prefix", paths: ["/news/", "/video/", "/learning/", "/games/"] },
        action: "redirect",
        to: "/messaging/"
      },
      { id: "li-10-events-root", match: { kind: "exact", paths: ["/events/"] }, action: "redirect", to: "/messaging/" },
      { id: "li-11-jobs", match: { kind: "prefix", paths: ["/jobs/"] }, action: "allow" },
      { id: "li-12-fallback", match: { kind: "any" }, action: "allow" }
    ]
  };

  // src/rules/decide.ts
  var MATCH_KINDS = ["prefix", "home", "singleSegmentPrefix", "username", "exact", "any"];
  var RULE_ACTIONS = ["allow", "redirect", "allowIfSharedPosts"];
  function fail(site, problem) {
    throw new Error(`Invalid rules for ${site}: ${problem}`);
  }
  function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  function normalizePath(pathname) {
    let path = pathname.toLowerCase().replace(/\/{2,}/g, "/");
    const query = path.indexOf("?");
    if (query !== -1) path = path.slice(0, query);
    const hash = path.indexOf("#");
    if (hash !== -1) path = path.slice(0, hash);
    if (!path.startsWith("/")) path = `/${path}`;
    if (!path.endsWith("/")) path = `${path}/`;
    return path;
  }
  function hostMatches(host, pattern) {
    return host === pattern || host.endsWith(`.${pattern}`);
  }
  function ruleMatches(rule, path, context, url) {
    var _a, _b, _c;
    const query = rule.match.query;
    if (query && !query.every((key) => url.searchParams.has(key))) return false;
    if (rule.match.kind !== "home" && rule.match.context !== void 0 && context !== rule.match.context) return false;
    switch (rule.match.kind) {
      case "prefix":
        return ((_a = rule.match.paths) != null ? _a : []).some((prefix) => path.startsWith(prefix));
      case "home":
        return path === "/" && (rule.match.context === void 0 || context === rule.match.context);
      case "singleSegmentPrefix":
        return ((_b = rule.match.prefixes) != null ? _b : []).some((prefix) => {
          if (!path.startsWith(prefix)) return false;
          const rest = path.slice(prefix.length);
          return rest.length > 0 && !rest.slice(0, -1).includes("/");
        });
      case "username":
        return path !== "/";
      case "exact":
        return ((_c = rule.match.paths) != null ? _c : []).some((candidate) => path === normalizePath(candidate));
      case "any":
        return true;
    }
  }
  function parseSiteRules(raw, site) {
    if (typeof raw !== "object" || raw === null) fail(site, "file must be an object");
    const file = raw;
    if (file.site !== site) fail(site, `file declares site "${String(file.site)}"`);
    if (!isStringArray(file.hosts) || file.hosts.length === 0) {
      fail(site, "hosts must be a non-empty list of strings");
    }
    const allowedHostSuffixes = file.allowedHostSuffixes === void 0 ? [] : file.allowedHostSuffixes;
    if (!isStringArray(allowedHostSuffixes)) fail(site, "allowedHostSuffixes must be a list of strings");
    const allowedHostPaths = [];
    if (file.allowedHostPaths !== void 0) {
      if (!Array.isArray(file.allowedHostPaths)) fail(site, "allowedHostPaths must be a list");
      for (const entry of file.allowedHostPaths) {
        if (typeof entry !== "object" || entry === null) fail(site, "allowedHostPaths entries must be objects");
        const record = entry;
        if (typeof record.host !== "string" || typeof record.path !== "string") {
          fail(site, "allowedHostPaths entries need host and path strings");
        }
        allowedHostPaths.push({ host: record.host.toLowerCase(), path: normalizePath(record.path) });
      }
    }
    const alwaysAllowHosts = file.alwaysAllowHosts === void 0 ? [] : file.alwaysAllowHosts;
    if (!isStringArray(alwaysAllowHosts)) fail(site, "alwaysAllowHosts must be a list of strings");
    if (!Array.isArray(file.rules) || file.rules.length === 0) fail(site, "rules must be a non-empty list");
    const rules2 = file.rules.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) fail(site, `rule ${index} must be an object`);
      const record = entry;
      if (typeof record.id !== "string") fail(site, `rule ${index} needs an id string`);
      const id = record.id;
      if (typeof record.match !== "object" || record.match === null) fail(site, `rule ${id} needs a match object`);
      const match = record.match;
      if (typeof match.kind !== "string" || !MATCH_KINDS.includes(match.kind)) {
        fail(site, `rule ${id} has unknown match kind "${String(match.kind)}"`);
      }
      if (match.paths !== void 0 && !isStringArray(match.paths)) fail(site, `rule ${id} paths must be strings`);
      if (match.prefixes !== void 0 && !isStringArray(match.prefixes)) fail(site, `rule ${id} prefixes must be strings`);
      if (match.context !== void 0 && typeof match.context !== "string") {
        fail(site, `rule ${id} context must be a string`);
      }
      if (match.query !== void 0 && !isStringArray(match.query)) fail(site, `rule ${id} query must be strings`);
      if (typeof record.action !== "string" || !RULE_ACTIONS.includes(record.action)) {
        fail(site, `rule ${id} has unknown action "${String(record.action)}"`);
      }
      const action = record.action;
      let to;
      if (action === "redirect" || action === "allowIfSharedPosts") {
        if (typeof record.to !== "string" || !record.to.startsWith("/")) {
          fail(site, `rule ${id} action ${action} needs a to path starting with /`);
        }
        to = record.to;
      }
      let keepQuery;
      if (record.keepQuery !== void 0) {
        if (!isStringArray(record.keepQuery)) fail(site, `rule ${id} keepQuery must be strings`);
        keepQuery = record.keepQuery;
      }
      if (record.keepRest !== void 0) {
        if (record.keepRest !== true) fail(site, `rule ${id} keepRest must be true when present`);
        if (match.kind !== "singleSegmentPrefix" || action !== "redirect" || !String(record.to).endsWith("/")) {
          fail(site, `rule ${id} keepRest needs a singleSegmentPrefix redirect whose to ends with /`);
        }
      }
      return {
        id,
        match: {
          kind: match.kind,
          paths: match.paths,
          prefixes: match.prefixes,
          context: match.context,
          query: match.query
        },
        action,
        to,
        keepQuery,
        keepRest: record.keepRest === true ? true : void 0
      };
    });
    if (!rules2.some((rule) => rule.match.kind === "any")) fail(site, "rules must include an any fallback");
    return {
      site,
      hosts: file.hosts.map((host) => host.toLowerCase()),
      allowedHostSuffixes: allowedHostSuffixes.map((suffix) => suffix.toLowerCase()),
      allowedHostPaths,
      alwaysAllowHosts: alwaysAllowHosts.map((host) => host.toLowerCase()),
      rules: rules2
    };
  }
  function redirectWithQuery(rule, url, path) {
    var _a, _b;
    let to = (_a = rule.to) != null ? _a : "/";
    if (rule.keepRest) {
      const prefix = ((_b = rule.match.prefixes) != null ? _b : []).find((candidate) => path.startsWith(candidate));
      const typed = url.pathname.replace(/\/{2,}/g, "/");
      if (prefix) to += (typed.endsWith("/") ? typed : `${typed}/`).slice(prefix.length);
    }
    if (!rule.keepQuery || rule.keepQuery.length === 0) {
      return { action: "redirect", to, rule: rule.id };
    }
    const params = new URLSearchParams();
    for (const key of rule.keepQuery) {
      for (const value of url.searchParams.getAll(key)) params.append(key, value);
    }
    const query = params.toString();
    return { action: "redirect", to: query ? `${to}?${query}` : to, rule: rule.id };
  }
  var RULES = {
    instagram: parseSiteRules(instagram_default2, "instagram"),
    linkedin: parseSiteRules(linkedin_default, "linkedin")
  };
  function decide(site, rawUrl, context, settings) {
    const rules2 = RULES[site];
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { action: "external", rule: "unparseable-url" };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { action: "allow", rule: "non-http-scheme" };
    }
    const host = url.hostname.toLowerCase();
    const path = normalizePath(url.pathname);
    if (!rules2.hosts.includes(host)) {
      if (rules2.allowedHostSuffixes.some((suffix) => hostMatches(host, suffix))) {
        return { action: "allow", rule: "asset-host" };
      }
      if (rules2.alwaysAllowHosts.some((entry) => hostMatches(host, entry))) {
        return { action: "allow", rule: "short-link-host" };
      }
      for (const entry of rules2.allowedHostPaths) {
        if (hostMatches(host, entry.host) && path.startsWith(entry.path)) {
          return { action: "allow", rule: "host-path" };
        }
      }
      return { action: "external", rule: "outside-host" };
    }
    for (const rule of rules2.rules) {
      if (!ruleMatches(rule, path, context, url)) continue;
      if (rule.action === "allow") return { action: "allow", rule: rule.id };
      if (rule.action === "redirect") return redirectWithQuery(rule, url, path);
      return settings.allowSharedPosts ? { action: "allow", rule: rule.id } : redirectWithQuery(rule, url, path);
    }
    return { action: "allow", rule: "unmatched-fallback" };
  }

  // src/inject/protocol.ts
  var DEFAULT_INJECT_SETTINGS = {
    allowSharedPosts: true,
    hideCounts: false
  };

  // src/inject/unread.ts
  function parseUnreadFromTitle(title) {
    const match = /^\s*\((\d{1,3})\)(?:\s|$)/.exec(title);
    if (!match) return 0;
    const count = Number.parseInt(match[1], 10);
    return Number.isFinite(count) ? count : 0;
  }

  // src/inject/common.ts
  var INJECT_VERSION = "t3.1";
  function createPoster(site) {
    return (message) => {
      try {
        const bridge = globalThis.ReactNativeWebView;
        if (bridge && typeof bridge.postMessage === "function") {
          bridge.postMessage(JSON.stringify(message));
        }
      } catch (error) {
        console.warn("[unfeed] postMessage failed", site, error);
      }
    };
  }
  function currentHref(win) {
    var _a;
    try {
      return typeof ((_a = win.location) == null ? void 0 : _a.href) === "string" ? win.location.href : "";
    } catch {
      return "";
    }
  }
  function readInjectSettings() {
    const raw = globalThis.__UNFEED_SETTINGS__;
    const merged = { ...DEFAULT_INJECT_SETTINGS };
    if (typeof raw === "object" && raw !== null) {
      const record = raw;
      if (typeof record.allowSharedPosts === "boolean") merged.allowSharedPosts = record.allowSharedPosts;
      if (typeof record.hideCounts === "boolean") merged.hideCounts = record.hideCounts;
    }
    return merged;
  }
  function installStyle(id, css) {
    const existing = document.getElementById(id);
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== css) existing.textContent = css;
      return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.documentElement.appendChild(style);
  }
  function rafThrottle(fn) {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      const run = () => {
        queued = false;
        try {
          fn();
        } catch (error) {
          console.warn("[unfeed] hide pass failed", error);
        }
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 16);
    };
  }
  function createApplyPass(site, settings, config, post) {
    return () => {
      var _a;
      try {
        if (!document.documentElement) return;
        if (config.css) installStyle(`unfeed-css-${site}`, config.css);
        for (const sweep of (_a = config.sweeps) != null ? _a : []) {
          try {
            sweep(settings, post);
          } catch (error) {
            console.warn("[unfeed] sweep failed", site, error);
          }
        }
      } catch (error) {
        console.warn("[unfeed] apply pass failed", site, error);
      }
    };
  }
  function enforceRoute(site, settings, href, post) {
    var _a;
    try {
      const declared = globalThis.__UNFEED_CONTEXT__;
      const context = typeof declared === "string" && declared ? declared : "page";
      const result = decide(site, href, context, settings);
      if (result.action !== "redirect" || !result.to) return;
      const target = new URL(result.to, location.origin).href;
      if (target === location.href) return;
      post({ type: "bounce", url: href, rule: (_a = result.rule) != null ? _a : "unknown", to: result.to });
      window.location.replace(target);
    } catch (error) {
      console.warn("[unfeed] in-page enforce failed", site, error);
    }
  }
  function installRouteHooks(win, onRoute) {
    var _a;
    const history = (_a = win.history) != null ? _a : {};
    const wrap = (name) => {
      const original = history[name];
      if (typeof original !== "function") return;
      history[name] = function(...args) {
        const result = original.apply(this, args);
        onRoute(currentHref(win));
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    if (typeof win.addEventListener === "function") {
      win.addEventListener("popstate", () => onRoute(currentHref(win)));
    }
    onRoute(currentHref(win));
  }
  function watchDom(apply) {
    const throttled = rafThrottle(apply);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(throttled);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    }
    window.setInterval(throttled, 2e3);
  }
  function watchUnread(post) {
    let last = null;
    const check = () => {
      var _a;
      const title = (_a = document.title) != null ? _a : "";
      if (!title.trim()) return;
      const count = parseUnreadFromTitle(title);
      if (count !== last) {
        last = count;
        post({ type: "unread", count });
      }
    };
    check();
    window.setInterval(check, 1500);
  }
  function whenDocumentReady(run) {
    if (document.documentElement) {
      run();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      observer.disconnect();
      run();
    });
    observer.observe(document, { childList: true });
  }
  function setupInject(site, config = {}) {
    const post = createPoster(site);
    try {
      const scope = globalThis;
      scope.__UNFEED__ = { site, version: INJECT_VERSION, decide };
      const win = scope.window;
      if (!win || typeof document === "undefined") return;
      const settings = readInjectSettings();
      const apply = createApplyPass(site, settings, config, post);
      whenDocumentReady(() => {
        apply();
        watchDom(apply);
      });
      const onRoute = (url) => {
        if (!url) return;
        post({ type: "route", url });
        if (config.enforce) enforceRoute(site, settings, url, post);
        apply();
      };
      installRouteHooks(win, onRoute);
      if (config.unread) watchUnread(post);
    } catch (error) {
      post({ type: "inject-error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  // src/inject/scopes.ts
  function isSingleSegment(path, prefixes) {
    return prefixes.some((prefix) => {
      if (!path.startsWith(prefix)) return false;
      const rest = path.slice(prefix.length);
      return rest.length > 0 && !rest.slice(0, -1).includes("/");
    });
  }
  function pageScopes(pathname) {
    const path = normalizePath(pathname);
    if (path === "/") return ["home"];
    if (path.startsWith("/explore/search/")) return ["explore-search"];
    if (isSingleSegment(path, ["/p/", "/reel/", "/tv/"])) return ["post-page"];
    return [];
  }

  // src/inject/instagram.ts
  var rules = parseNamedCss(instagram_default);
  function activeScopes(settings) {
    const scopes = new Set(pageScopes(location.pathname));
    if (settings.hideCounts) scopes.add("counts");
    return scopes;
  }
  function countMatches(selectors) {
    let total = 0;
    for (const selector of selectors) {
      try {
        total += document.querySelectorAll(selector).length;
      } catch {
      }
    }
    return total;
  }
  var applyNamedRules = (settings, post) => {
    const live = activeScopes(settings);
    const matched = {};
    for (const rule of rules) {
      const applies = rule.scopes.every((scope) => live.has(scope));
      const element = `unfeed-rule-ig-${rule.id}`;
      if (!applies) {
        installStyle(element, "");
        matched[rule.id] = 0;
        continue;
      }
      installStyle(element, ruleCss(rule));
      matched[rule.id] = countMatches(ruleSelectors(rule));
    }
    post({ type: "hide-stats", matched });
  };
  var detectUsername = (_settings, post) => {
    var _a, _b;
    const scope = globalThis;
    const state = scope.__UNFEED_IG__ = (_a = scope.__UNFEED_IG__) != null ? _a : {};
    if (state.postedUsername) return;
    for (const anchor of document.querySelectorAll("a[href]")) {
      if (!(anchor instanceof HTMLAnchorElement)) continue;
      let path = "";
      try {
        path = new URL((_b = anchor.getAttribute("href")) != null ? _b : "", location.origin).pathname;
      } catch {
        continue;
      }
      if (!/^\/[A-Za-z0-9._]+\/?$/.test(path)) continue;
      if (path.startsWith("/explore") || path.startsWith("/reels")) continue;
      if (!anchor.querySelector("img")) continue;
      const value = path.replace(/\//g, "");
      state.postedUsername = value;
      post({ type: "ig-username", value });
      return;
    }
  };
  var HIDDEN_ATTR = "data-unfeed-hidden";
  function hide(element) {
    if (element.getAttribute(HIDDEN_ATTR) === null) element.setAttribute(HIDDEN_ATTR, "");
  }
  var NAV_ICON_LABELS = /* @__PURE__ */ new Set([
    "Home",
    "Reels",
    "Explore",
    "Search",
    "Messages",
    "Direct",
    "Notifications",
    "Activity Feed",
    "Instagram",
    "Threads"
  ]);
  function navLabel(anchor) {
    for (const svg of anchor.querySelectorAll("svg[aria-label]")) {
      const label = svg.getAttribute("aria-label");
      if (label && NAV_ICON_LABELS.has(label)) return label;
    }
    return null;
  }
  var PAGE_CONTENT = 'main, [role="main"], [role="dialog"], textarea';
  function holdsPageContent(element) {
    if (element === document.body || element === document.documentElement) return true;
    return element.matches(PAGE_CONTENT) || element.querySelector(PAGE_CONTENT) !== null;
  }
  function isPinned(element) {
    const position = getComputedStyle(element).position;
    return position === "fixed" || position === "sticky";
  }
  function navLinkCount(container) {
    let count = 0;
    for (const anchor of container.querySelectorAll("a[href]")) {
      if (navLabel(anchor)) count += 1;
    }
    return count;
  }
  function navBarFor(anchor) {
    let candidate = null;
    let node = anchor.parentElement;
    for (let hop = 0; node !== null && hop < 16; hop += 1) {
      if (holdsPageContent(node)) break;
      if (isPinned(node)) return node;
      candidate = node;
      node = node.parentElement;
    }
    if (candidate === null || anchor.closest('main, [role="main"]')) return null;
    const barSized = candidate.getBoundingClientRect().height <= window.innerHeight * 0.3;
    return barSized && navLinkCount(candidate) >= 2 ? candidate : null;
  }
  var hideOwnNav = () => {
    for (const anchor of document.querySelectorAll("a[href]")) {
      if (anchor.closest(`[${HIDDEN_ATTR}], [role="dialog"]`)) continue;
      if (!navLabel(anchor)) continue;
      const bar = navBarFor(anchor);
      if (bar) hide(bar);
    }
  };
  var OPEN_APP_PATTERN = /^(get the app|open app|open the app|use the app|open instagram|get instagram|download the app|switch to the app)$/i;
  function hideTightContainer(trigger) {
    var _a;
    let target = trigger;
    let node = trigger.parentElement;
    for (let hop = 0; node !== null && hop < 6; hop += 1) {
      if (holdsPageContent(node) || ((_a = node.textContent) != null ? _a : "").trim().length > 160) break;
      target = node;
      if (isPinned(node)) break;
      node = node.parentElement;
    }
    hide(target);
  }
  var hideAppBanners = () => {
    var _a;
    for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
      if (trigger.closest(`[${HIDDEN_ATTR}]`)) continue;
      if (OPEN_APP_PATTERN.test(((_a = trigger.textContent) != null ? _a : "").trim())) hideTightContainer(trigger);
    }
  };
  var KEEP_ATTR = "data-unfeed-keep";
  var STORY_CONTROL = `[aria-label^="Story by" i], [aria-label$="'s story" i], [aria-label*="'s story," i], a[href^="/stories/"]`;
  var USERNAME = /^[A-Za-z0-9._]{1,30}$/;
  function storyUsername(control) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const link = control.matches('a[href^="/stories/"]') ? control : control.querySelector('a[href^="/stories/"]');
    const href = (_a = link == null ? void 0 : link.getAttribute("href")) != null ? _a : "";
    const fromHref = (_b = /^\/stories\/([^/?#]+)/.exec(href)) == null ? void 0 : _b[1];
    if (fromHref && fromHref !== "highlights" && USERNAME.test(fromHref)) return fromHref;
    const label = ((_c = control.getAttribute("aria-label")) != null ? _c : "").trim();
    const fromLabel = (_f = (_d = /^story by ([^,\s]+)/i.exec(label)) == null ? void 0 : _d[1]) != null ? _f : (_e = /^([^,\s]+)'s story/i.exec(label)) == null ? void 0 : _e[1];
    if (fromLabel && USERNAME.test(fromLabel)) return fromLabel;
    const alt = (_h = (_g = control.querySelector("img[alt]")) == null ? void 0 : _g.getAttribute("alt")) != null ? _h : "";
    const fromAlt = (_i = /^([^,\s]+)'s profile picture/i.exec(alt)) == null ? void 0 : _i[1];
    return fromAlt && USERNAME.test(fromAlt) ? fromAlt : null;
  }
  function storyAvatar(control) {
    const image = control.querySelector("img");
    if (!(image instanceof HTMLImageElement)) return null;
    const source = image.currentSrc || image.getAttribute("src") || "";
    try {
      const url = new URL(source, location.origin);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  }
  function readStoryItems(root) {
    const items = [];
    const seen = /* @__PURE__ */ new Set();
    for (const control of root.querySelectorAll(STORY_CONTROL)) {
      if (control.closest("article")) continue;
      const username = storyUsername(control);
      if (!username || seen.has(username.toLowerCase())) continue;
      seen.add(username.toLowerCase());
      items.push({ username, avatar: storyAvatar(control) });
    }
    return items;
  }
  var TRAY_GIVE_UP_MS = 1e4;
  function watchStoriesTray() {
    const context = globalThis.__UNFEED_CONTEXT__;
    if (context !== "stories-tray" || typeof document === "undefined") return;
    const post = createPoster("instagram");
    const started = Date.now();
    let last = "";
    const check = () => {
      try {
        silenceVideos();
        if (!pageScopes(location.pathname).includes("home")) return;
        const items = readStoryItems(document);
        const done = items.length > 0 || Date.now() - started > TRAY_GIVE_UP_MS;
        const key = JSON.stringify([items, done]);
        if (key === last) return;
        last = key;
        post({ type: "ig-stories", items, done });
      } catch (error) {
        console.warn("[unfeed] stories tray read failed", error);
      }
    };
    window.setInterval(check, 700);
    let pending = false;
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(() => {
        if (pending) return;
        pending = true;
        setTimeout(() => {
          pending = false;
          check();
        }, 150);
      }).observe(document, { childList: true, subtree: true });
    }
  }
  var keepVideosInline = () => {
    for (const video of document.querySelectorAll("video")) {
      if (video.getAttribute("playsinline") !== null) continue;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.playsInline = true;
    }
  };
  function silenceVideos() {
    for (const video of document.querySelectorAll("video")) {
      video.muted = true;
      if (!video.paused) video.pause();
    }
  }
  var silenceHiddenPage = () => {
    if (globalThis.__UNFEED_CONTEXT__ === "stories-tray") silenceVideos();
  };
  var SOUND_OFF_LABEL = /^(audio is muted|audio muted|unmute|sound off|turn sound on|play sound)$/i;
  var SOUND_CONTROL_LABEL = /^(audio is muted|audio muted|audio is playing|toggle audio|unmute|mute|sound off|sound on|turn sound on|turn sound off|play sound)$/i;
  function ariaLabel(element) {
    var _a;
    return ((_a = element.getAttribute("aria-label")) != null ? _a : "").trim();
  }
  function press(element) {
    if (element instanceof HTMLElement) element.click();
    else element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
  function soundOffButton(video) {
    var _a;
    let node = video.parentElement;
    for (let hop = 0; node !== null && hop < 8; hop += 1) {
      if (node.querySelectorAll("video").length > 1) return null;
      for (const candidate of node.querySelectorAll("[aria-label]")) {
        if (SOUND_OFF_LABEL.test(ariaLabel(candidate))) return (_a = candidate.closest('button, [role="button"]')) != null ? _a : candidate;
      }
      node = node.parentElement;
    }
    return null;
  }
  function unmute(video, state) {
    state.ourChangeUntil = Date.now() + 800;
    video.muted = false;
    video.volume = 1;
  }
  function giveSound(video, state) {
    state.given.add(video);
    const button = soundOffButton(video);
    if (!button) {
      unmute(video, state);
      return;
    }
    state.ourChangeUntil = Date.now() + 800;
    press(button);
    window.setTimeout(() => {
      if (!state.userChose && video.muted) unmute(video, state);
    }, 300);
  }
  function installVideoSound() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    const state = { userChose: false, ourChangeUntil: 0, given: /* @__PURE__ */ new WeakSet() };
    const hiddenReader = () => globalThis.__UNFEED_CONTEXT__ === "stories-tray";
    document.addEventListener(
      "play",
      (event) => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement)) return;
        if (hiddenReader()) {
          silenceVideos();
          return;
        }
        if (state.userChose || state.given.has(video)) return;
        giveSound(video, state);
      },
      true
    );
    document.addEventListener(
      "volumechange",
      (event) => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement) || Date.now() < state.ourChangeUntil) return;
        if (state.given.has(video) && (video.muted || video.volume === 0)) state.userChose = true;
      },
      true
    );
    document.addEventListener(
      "click",
      (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        const control = event.target.closest("[aria-label]");
        if (control && SOUND_CONTROL_LABEL.test(ariaLabel(control))) state.userChose = true;
      },
      true
    );
  }
  var CREATE_LABEL = /^(new post|create|new|post)$/i;
  function findCreateControl() {
    var _a;
    for (const svg of document.querySelectorAll("svg[aria-label]")) {
      if (!CREATE_LABEL.test((_a = svg.getAttribute("aria-label")) != null ? _a : "")) continue;
      const control = svg.closest('a, button, [role="link"], [role="button"]');
      if (control instanceof HTMLElement) return control;
    }
    const link = document.querySelector('a[href^="/create/"]');
    if (link instanceof HTMLElement) return link;
    const input = document.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
    return input instanceof HTMLElement ? input : null;
  }
  var SHEET_ID = "unfeed-post-sheet";
  function showPostSheet(control) {
    var _a;
    (_a = document.getElementById(SHEET_ID)) == null ? void 0 : _a.remove();
    const sheet = document.createElement("div");
    sheet.id = SHEET_ID;
    sheet.setAttribute(KEEP_ATTR, "");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "New post");
    sheet.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#1c1c20;border:1px solid #2a2a30;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,.3);padding:16px;font:15px -apple-system,Inter,system-ui,sans-serif;color:#f2f2f4;";
    const title = document.createElement("div");
    title.textContent = "New post";
    title.style.cssText = "font-weight:600;margin-bottom:4px;";
    const hint = document.createElement("div");
    hint.textContent = "Pick a photo or video to share on Instagram.";
    hint.style.cssText = "color:#9a9aa3;margin-bottom:14px;";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.textContent = "Choose photo or video";
    choose.style.cssText = "display:block;width:100%;padding:12px;border:0;border-radius:6px;background:#2ee6a6;color:#0b0b0d;font:600 15px -apple-system,Inter,system-ui,sans-serif;";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = "display:block;width:100%;margin-top:8px;padding:10px;border:0;background:none;color:#9a9aa3;font:15px -apple-system,Inter,system-ui,sans-serif;";
    choose.addEventListener("click", () => {
      sheet.remove();
      control.click();
    });
    cancel.addEventListener("click", () => sheet.remove());
    sheet.append(title, hint, choose, cancel);
    document.body.appendChild(sheet);
  }
  function installCreateHook() {
    const scope = globalThis;
    const post = createPoster("instagram");
    scope.__UNFEED_CREATE__ = () => {
      const control = findCreateControl();
      if (control) showPostSheet(control);
      else post({ type: "ig-create-missing" });
    };
  }
  installCreateHook();
  installVideoSound();
  watchStoriesTray();
  setupInject("instagram", {
    sweeps: [applyNamedRules, detectUsername, hideOwnNav, hideAppBanners, keepVideosInline, silenceHiddenPage],
    unread: true,
    enforce: true
  });
})();
