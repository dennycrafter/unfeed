// ==UserScript==
// @name Unfeed X
// @namespace https://github.com/dennycrafter/unfeed
// @version 1.8.0
// @description X with no feed: opens your messages, blocks the home timeline, explore and search, and keeps posting, replies, messages, notifications and your profile.
// @match https://x.com/*
// @match https://www.x.com/*
// @match https://mobile.x.com/*
// @match https://twitter.com/*
// @match https://www.twitter.com/*
// @match https://mobile.twitter.com/*
// @noframes
// @grant none
// @run-at document-start
// ==/UserScript==

"use strict";
(() => {
  // src/inject/css/x.css
  var x_default = `/*
  Unfeed hide rules for X (Denis, 21 Nov 2026). Stable hooks only: href,
  aria-label, role and X's data-testid names. X's generated class names are
  never used. Same marker format as instagram.css (src/inject/cssRules.ts).
*/

/* @unfeed-rule x-feed-links -- links into the home timeline, explore, search, lists, communities, bookmarks and trends */
a[href="/home"],
a[href="/explore"],
a[href^="/explore/"],
a[href^="/i/lists"],
a[href^="/i/communities"],
a[href="/i/bookmarks"],
a[href^="/i/trends"],
a[data-testid="AppTabBar_Home_Link"],
a[data-testid="AppTabBar_Explore_Link"] {
  display: none !important;
}

/* @unfeed-rule x-side-feeds -- trends and who to follow panels */
[aria-label="Timeline: Trending now"],
[aria-label="Who to follow"],
aside[aria-label="Who to follow"],
[data-testid="sidebarColumn"] {
  display: none !important;
}

/* @unfeed-rule x-swept -- anything a sweep in src/inject/x.ts decided to hide */
[data-unfeed-hidden] {
  display: none !important;
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

  // src/rules/instagram.json
  var instagram_default = {
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
    pathAliases: ["/mwlite/"],
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
      {
        id: "li-8-notification-post",
        match: { kind: "prefix", paths: ["/feed/"], queryValue: "urn:li:(activity|share|ugcPost):[A-Za-z0-9_-]+" },
        action: "redirect",
        to: "/feed/update/",
        appendQueryValue: true
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

  // src/rules/x.json
  var x_default2 = {
    site: "x",
    hosts: ["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
    allowedHostSuffixes: ["twimg.com"],
    allowedHostPaths: [],
    rules: [
      {
        id: "x-1-auth",
        match: { kind: "prefix", paths: ["/i/flow/", "/i/jf/onboarding/", "/login/", "/logout/", "/account/", "/settings/", "/i/oauth2/", "/i/safety/", "/i/verified", "/i/premium"] },
        action: "allow"
      },
      { id: "x-2-compose", match: { kind: "prefix", paths: ["/compose/", "/intent/"] }, action: "allow" },
      { id: "x-3-messages", match: { kind: "prefix", paths: ["/messages/", "/i/chat/"] }, action: "allow" },
      { id: "x-4-notifications", match: { kind: "prefix", paths: ["/notifications/"] }, action: "allow" },
      { id: "x-5-home", match: { kind: "home" }, action: "redirect", to: "/messages/" },
      { id: "x-5-home-timeline", match: { kind: "exact", paths: ["/home/"] }, action: "redirect", to: "/messages/" },
      {
        id: "x-6-feeds",
        match: {
          kind: "prefix",
          paths: ["/explore/", "/search/", "/hashtag/", "/i/lists/", "/i/communities/", "/i/bookmarks/", "/i/trends/", "/i/topics/"]
        },
        action: "redirect",
        to: "/messages/"
      },
      { id: "x-7-fallback", match: { kind: "any" }, action: "allow" }
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
  function matchingQueryValue(url, pattern) {
    const re = new RegExp(`^(?:${pattern})$`);
    for (const value of url.searchParams.values()) {
      if (re.test(value)) return value;
    }
    return null;
  }
  function ruleMatches(rule, path, context, url) {
    var _a, _b, _c;
    const query = rule.match.query;
    if (query && !query.every((key) => url.searchParams.has(key))) return false;
    if (rule.match.queryValue !== void 0 && matchingQueryValue(url, rule.match.queryValue) === null) return false;
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
    const pathAliases = file.pathAliases === void 0 ? [] : file.pathAliases;
    if (!isStringArray(pathAliases) || pathAliases.some((alias) => !/^\/[^/]+\/$/.test(alias))) {
      fail(site, "pathAliases must be one segment prefixes like /mwlite/");
    }
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
      if (match.queryValue !== void 0) {
        if (typeof match.queryValue !== "string") fail(site, `rule ${id} queryValue must be a string`);
        try {
          new RegExp(match.queryValue);
        } catch {
          fail(site, `rule ${id} queryValue is not a valid pattern`);
        }
      }
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
      if (record.appendQueryValue !== void 0) {
        if (record.appendQueryValue !== true) fail(site, `rule ${id} appendQueryValue must be true when present`);
        if (match.queryValue === void 0 || action !== "redirect" || !String(record.to).endsWith("/")) {
          fail(site, `rule ${id} appendQueryValue needs a queryValue redirect whose to ends with /`);
        }
      }
      return {
        id,
        match: {
          kind: match.kind,
          paths: match.paths,
          prefixes: match.prefixes,
          context: match.context,
          query: match.query,
          queryValue: match.queryValue
        },
        action,
        to,
        keepQuery,
        keepRest: record.keepRest === true ? true : void 0,
        appendQueryValue: record.appendQueryValue === true ? true : void 0
      };
    });
    if (!rules2.some((rule) => rule.match.kind === "any")) fail(site, "rules must include an any fallback");
    return {
      site,
      hosts: file.hosts.map((host) => host.toLowerCase()),
      allowedHostSuffixes: allowedHostSuffixes.map((suffix) => suffix.toLowerCase()),
      allowedHostPaths,
      alwaysAllowHosts: alwaysAllowHosts.map((host) => host.toLowerCase()),
      pathAliases: pathAliases.map((alias) => alias.toLowerCase()),
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
    if (rule.appendQueryValue && rule.match.queryValue !== void 0) {
      const value = matchingQueryValue(url, rule.match.queryValue);
      if (value) to += `${value}/`;
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
    instagram: parseSiteRules(instagram_default, "instagram"),
    linkedin: parseSiteRules(linkedin_default, "linkedin"),
    x: parseSiteRules(x_default2, "x")
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
    let path = normalizePath(url.pathname);
    const alias = rules2.pathAliases.find((prefix) => path.startsWith(prefix));
    if (alias) path = path.slice(alias.length - 1);
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

  // src/rules/returnRules.ts
  var RETURN_RULES = /* @__PURE__ */ new Set([
    "ig-5-home",
    "ig-8-reels",
    "li-9-feed",
    "li-9-home",
    // X (Denis, 21 Nov 2026): home and the feeds go back, never to a timeline.
    "x-5-home",
    "x-5-home-timeline",
    "x-6-feeds"
  ]);
  function isReturnablePage(url) {
    try {
      const path = new URL(url).pathname.toLowerCase();
      return !path.startsWith("/stories/") && path !== "/" && path !== "/feed/" && path !== "/home" && !path.startsWith("/accounts/login") && !path.startsWith("/compose/") && !path.startsWith("/i/flow/");
    } catch {
      return false;
    }
  }
  function returnTarget(rule, ruleTarget, lastGood, homeUrl, blockedUrl) {
    if (!rule || !RETURN_RULES.has(rule)) return ruleTarget;
    if (lastGood && lastGood !== blockedUrl) return lastGood;
    if (homeUrl && homeUrl !== blockedUrl) return homeUrl;
    return ruleTarget;
  }

  // src/inject/protocol.ts
  var DEFAULT_INJECT_SETTINGS = {
    allowSharedPosts: true,
    hideCounts: false
  };

  // src/inject/junk.ts
  var JUNK = [
    // Instagram's own event logging ("banzai").
    /^https:\/\/(www\.)?instagram\.com\/ajax\/bz\b/,
    /^https:\/\/(www\.)?instagram\.com\/logging\//,
    /^https:\/\/graph\.instagram\.com\/logging_client_events\b/,
    // LinkedIn ad tags and tracking pixels.
    /^https:\/\/(www\.)?linkedin\.com\/tscp-serving\//,
    /^https:\/\/(www\.)?linkedin\.com\/li\/track\b/,
    /^https:\/\/px\.ads\.linkedin\.com\//,
    /^https:\/\/snap\.licdn\.com\/li\.lms-analytics\//
  ];
  function isJunk(url, origin) {
    let absolute;
    try {
      absolute = new URL(url, origin).href;
    } catch {
      return false;
    }
    return JUNK.some((pattern) => pattern.test(absolute));
  }

  // src/inject/unread.ts
  function parseUnreadFromTitle(title) {
    const match = /^\s*\((\d{1,3})\)(?:\s|$)/.exec(title);
    if (!match) return 0;
    const count = Number.parseInt(match[1], 10);
    return Number.isFinite(count) ? count : 0;
  }

  // src/inject/common.ts
  var INJECT_VERSION = "t3.2";
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
  var LAST_GOOD_KEY = "unfeed-last-good";
  function readLastGood() {
    var _a, _b;
    try {
      return (_b = (_a = window.sessionStorage) == null ? void 0 : _a.getItem(LAST_GOOD_KEY)) != null ? _b : null;
    } catch {
      return null;
    }
  }
  function saveLastGood(href) {
    var _a;
    try {
      (_a = window.sessionStorage) == null ? void 0 : _a.setItem(LAST_GOOD_KEY, href);
    } catch {
    }
  }
  function declaredHome() {
    const home = globalThis.__UNFEED_HOME__;
    return typeof home === "string" && home ? home : null;
  }
  function enforceRoute(site, settings, href, post) {
    var _a;
    try {
      const declared = globalThis.__UNFEED_CONTEXT__;
      const context = typeof declared === "string" && declared ? declared : "page";
      const result = decide(site, href, context, settings);
      if (result.action === "allow") {
        if (isReturnablePage(href)) saveLastGood(href);
        return;
      }
      if (result.action !== "redirect" || !result.to) return;
      const ruleTarget = new URL(result.to, location.origin).href;
      const target = returnTarget(result.rule, ruleTarget, readLastGood(), declaredHome(), href);
      if (target === location.href) return;
      post({ type: "bounce", url: href, rule: (_a = result.rule) != null ? _a : "unknown", to: target === ruleTarget ? result.to : target });
      window.location.replace(target);
    } catch (error) {
      console.warn("[unfeed] in-page enforce failed", site, error);
    }
  }
  function installRouteHooks(win, onRoute, onMove) {
    var _a;
    const history = (_a = win.history) != null ? _a : {};
    const wrap = (name) => {
      const original = history[name];
      if (typeof original !== "function") return;
      history[name] = function(...args) {
        const result = original.apply(this, args);
        const href = currentHref(win);
        if (name === "pushState") onMove == null ? void 0 : onMove(href);
        onRoute(href);
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    if (typeof win.addEventListener === "function") {
      win.addEventListener("popstate", () => {
        const href = currentHref(win);
        onMove == null ? void 0 : onMove(href);
        onRoute(href);
      });
    }
    onRoute(currentHref(win));
  }
  function reportLoadSpeed(post) {
    let sent = false;
    const send = (ms) => {
      if (sent || !Number.isFinite(ms) || ms <= 0) return;
      sent = true;
      post({ type: "perf", kind: "load", url: location.href, ms: Math.round(ms) });
    };
    try {
      if (typeof PerformanceObserver === "function") {
        const observer = new PerformanceObserver((list) => {
          const paint = list.getEntriesByName("first-contentful-paint")[0];
          if (paint) {
            observer.disconnect();
            send(paint.startTime);
          }
        });
        observer.observe({ type: "paint", buffered: true });
      }
    } catch {
    }
    const fallback = () => {
      try {
        const paint = performance.getEntriesByName("first-contentful-paint")[0];
        const nav = performance.getEntriesByType("navigation")[0];
        send(paint ? paint.startTime : nav ? nav.domContentLoadedEventEnd : performance.now());
      } catch {
      }
    };
    if (document.readyState === "complete") window.setTimeout(fallback, 0);
    else window.addEventListener("load", () => window.setTimeout(fallback, 0), { once: true });
  }
  function darkUntilStyled() {
    const id = "unfeed-loading-canvas";
    installStyle(id, ":root{color-scheme:dark;background:#0b0b0d}");
    const remove = () => {
      var _a;
      return (_a = document.getElementById(id)) == null ? void 0 : _a.remove();
    };
    if (document.readyState !== "loading") window.setTimeout(remove, 0);
    else document.addEventListener("DOMContentLoaded", remove, { once: true });
  }
  function blockJunk(post) {
    var _a;
    const scope = globalThis;
    const origin = typeof location !== "undefined" ? location.origin : void 0;
    const count = () => {
      var _a2;
      scope.__UNFEED_JUNK__ = ((_a2 = scope.__UNFEED_JUNK__) != null ? _a2 : 0) + 1;
    };
    const originalFetch = scope.fetch;
    if (typeof originalFetch === "function") {
      scope.fetch = function fetchWithoutJunk(input, init) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (isJunk(url, origin)) {
          count();
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return originalFetch.call(this, input, init);
      };
    }
    const beacon = (_a = scope.navigator) == null ? void 0 : _a.sendBeacon;
    if (scope.navigator && typeof beacon === "function") {
      scope.navigator.sendBeacon = function sendBeaconWithoutJunk(url, data) {
        if (isJunk(String(url), origin)) {
          count();
          return true;
        }
        return beacon.call(this, url, data);
      };
    }
    const Xhr = scope.XMLHttpRequest;
    if (typeof Xhr === "function") {
      const junkRequests = /* @__PURE__ */ new WeakSet();
      const open = Xhr.prototype.open;
      const send = Xhr.prototype.send;
      Xhr.prototype.open = function openWithoutJunk(...args) {
        if (isJunk(String(args[1]), origin)) junkRequests.add(this);
        return open.apply(this, args);
      };
      Xhr.prototype.send = function sendWithoutJunk(body) {
        if (!junkRequests.has(this)) {
          send.call(this, body);
          return;
        }
        count();
        Object.defineProperty(this, "readyState", { value: 4, configurable: true });
        Object.defineProperty(this, "status", { value: 204, configurable: true });
        Object.defineProperty(this, "responseText", { value: "", configurable: true });
        Object.defineProperty(this, "response", { value: "", configurable: true });
        window.setTimeout(() => {
          for (const type of ["readystatechange", "load", "loadend"]) this.dispatchEvent(new Event(type));
        }, 0);
      };
    }
    void post;
  }
  var SETTLE_QUIET_MS = 300;
  var SETTLE_LIMIT_MS = 8e3;
  function createMoveTimer(post) {
    let run = 0;
    return (url) => {
      run += 1;
      const id = run;
      if (typeof MutationObserver === "undefined" || typeof performance === "undefined" || !document.body) return;
      const start = performance.now();
      let last = start;
      const observer = new MutationObserver(() => {
        last = performance.now();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const check = () => {
        if (id !== run) {
          observer.disconnect();
          return;
        }
        const now = performance.now();
        if (now - last >= SETTLE_QUIET_MS) {
          observer.disconnect();
          if (last > start) post({ type: "perf", kind: "move", url, ms: Math.round(last - start) });
          return;
        }
        if (now - start > SETTLE_LIMIT_MS) {
          observer.disconnect();
          return;
        }
        window.setTimeout(check, 100);
      };
      window.setTimeout(check, 100);
    };
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
      blockJunk(post);
      const apply = createApplyPass(site, settings, config, post);
      whenDocumentReady(() => {
        darkUntilStyled();
        apply();
        watchDom(apply);
      });
      const onRoute = (url) => {
        if (!url) return;
        post({ type: "route", url });
        if (config.enforce) enforceRoute(site, settings, url, post);
        apply();
      };
      installRouteHooks(win, onRoute, createMoveTimer(post));
      reportLoadSpeed(post);
      if (config.unread) watchUnread(post);
    } catch (error) {
      post({ type: "inject-error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  // src/inject/x.ts
  var rules = parseNamedCss(x_default);
  var applyNamedRules = () => {
    for (const rule of rules) installStyle(`unfeed-rule-x-${rule.id}`, ruleCss(rule));
  };
  var HIDDEN_ATTR = "data-unfeed-hidden";
  var TIMELINE_ATTR = "data-unfeed-timeline";
  var NOTE_ID = "unfeed-x-note";
  function hide(element) {
    if (element.getAttribute(HIDDEN_ATTR) === null) element.setAttribute(HIDDEN_ATTR, "");
  }
  var NOT_A_PROFILE = /* @__PURE__ */ new Set([
    "home",
    "explore",
    "search",
    "notifications",
    "messages",
    "compose",
    "settings",
    "i",
    "login",
    "logout",
    "account",
    "intent",
    "hashtag",
    "tos",
    "privacy",
    "jobs"
  ]);
  var USERNAME = /^[A-Za-z0-9_]{1,15}$/;
  var POST_LISTS = /* @__PURE__ */ new Set(["with_replies", "media", "likes", "highlights", "articles", "superfollows"]);
  function profileOf(pathname) {
    const parts = pathname.split("/").filter(Boolean);
    const name = parts[0];
    if (!name || !USERNAME.test(name) || NOT_A_PROFILE.has(name.toLowerCase())) return null;
    if (parts.length > 1 && !POST_LISTS.has(parts[1].toLowerCase())) return null;
    return name;
  }
  var OWN_KEY = "unfeed-x-username";
  function ownUsername() {
    var _a, _b;
    try {
      return (_b = (_a = window.localStorage) == null ? void 0 : _a.getItem(OWN_KEY)) != null ? _b : null;
    } catch {
      return null;
    }
  }
  var detectUsername = (_settings, post) => {
    var _a, _b, _c, _d;
    const link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    const href = (_a = link == null ? void 0 : link.getAttribute("href")) != null ? _a : "";
    const value = (_b = /^\/([A-Za-z0-9_]{1,15})$/.exec(href)) == null ? void 0 : _b[1];
    if (!value) return;
    const scope = globalThis;
    const state = scope.__UNFEED_X__ = (_c = scope.__UNFEED_X__) != null ? _c : {};
    if (state.posted === value) return;
    state.posted = value;
    try {
      (_d = window.localStorage) == null ? void 0 : _d.setItem(OWN_KEY, value);
    } catch {
    }
    post({ type: "x-username", value });
  };
  function isOwnProfile(name) {
    const own = ownUsername();
    if (own && own.toLowerCase() === name.toLowerCase()) return true;
    return document.querySelector('a[href="/settings/profile"], [data-testid="editProfileButton"]') !== null;
  }
  var hideOtherTimelines = () => {
    var _a, _b, _c, _d;
    const name = profileOf(location.pathname);
    if (!name || isOwnProfile(name)) {
      (_a = document.getElementById(NOTE_ID)) == null ? void 0 : _a.remove();
      for (const element of document.querySelectorAll(`[${TIMELINE_ATTR}]`)) {
        element.removeAttribute(TIMELINE_ATTR);
        element.removeAttribute(HIDDEN_ATTR);
      }
      return;
    }
    const primary = (_c = (_b = document.querySelector('[data-testid="primaryColumn"]')) != null ? _b : document.querySelector("main")) != null ? _c : document.body;
    let first = null;
    for (const timeline of primary.querySelectorAll('[aria-label^="Timeline:"], [role="tablist"]')) {
      if (timeline.closest('[role="dialog"]')) continue;
      timeline.setAttribute(TIMELINE_ATTR, "");
      hide(timeline);
      first = first != null ? first : timeline;
    }
    if (first && !document.getElementById(NOTE_ID)) {
      const message = document.createElement("div");
      message.id = NOTE_ID;
      message.textContent = "Posts are hidden in Unfeed. Open a single post from your notifications or messages.";
      message.style.cssText = "padding:24px 16px;color:#8b98a5;font:15px -apple-system,system-ui,sans-serif;text-align:center;";
      (_d = first.parentElement) == null ? void 0 : _d.insertBefore(message, first);
    }
  };
  var DISCOVER_HEADING = /^(discover more|more posts|you might like)\b/i;
  var hideDiscoverMore = () => {
    var _a;
    if (!/^\/[^/]+\/status\/\d+/.test(location.pathname)) return;
    let hiding = false;
    for (const cell of document.querySelectorAll('[data-testid="cellInnerDiv"]')) {
      if (!hiding) {
        const heading = cell.querySelector('h2, [role="heading"]');
        const text = ((_a = heading == null ? void 0 : heading.textContent) != null ? _a : "").trim();
        if (text && DISCOVER_HEADING.test(text)) hiding = true;
      }
      if (hiding) hide(cell);
    }
  };
  var hideOwnBars = () => {
    var _a;
    if (!globalThis.ReactNativeWebView) return;
    for (const bar of document.querySelectorAll('nav[role="navigation"], [data-testid="BottomBar"]')) {
      if (bar.querySelector('a[data-testid^="AppTabBar_"]')) hide((_a = bar.closest('[data-testid="BottomBar"]')) != null ? _a : bar);
    }
  };
  var OPEN_APP = /^(open app|get the app|use the app|open in app|switch to the app|download the app)$/i;
  var hideAppBanners = () => {
    var _a, _b;
    for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
      if (trigger.closest(`[${HIDDEN_ATTR}]`)) continue;
      if (!OPEN_APP.test(((_a = trigger.textContent) != null ? _a : "").trim())) continue;
      let target = trigger;
      let node = trigger.parentElement;
      for (let hop = 0; node && hop < 6; hop += 1) {
        if (((_b = node.textContent) != null ? _b : "").trim().length > 200 || node.matches('main, [role="main"]')) break;
        target = node;
        node = node.parentElement;
      }
      hide(target);
    }
  };
  setupInject("x", {
    sweeps: [applyNamedRules, detectUsername, hideOwnBars, hideOtherTimelines, hideDiscoverMore, hideAppBanners],
    unread: true,
    enforce: true
  });
})();
