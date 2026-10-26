// ==UserScript==
// @name Unfeed LinkedIn
// @namespace https://github.com/dennycrafter/unfeed
// @version 1.5.0
// @description LinkedIn with no feed: opens your messages, hides the feed and post results, and keeps messages, people search and profiles.
// @match https://linkedin.com/*
// @match https://www.linkedin.com/*
// @noframes
// @grant none
// @run-at document-start
// ==/UserScript==

"use strict";
(() => {
  // src/inject/css/linkedin.css
  var linkedin_default = `/* Unfeed hide rules for LinkedIn (charter section 8.4). Stable hooks only:
   hrefs, roles, aria labels and structure. Hashed class names are never
   used; fixtures in tests/fixtures carry random hashed classes to prove it.
   Text-only targets are hidden by the sweeps in src/inject/linkedin.ts. */

/* LinkedIn's own top and bottom bars stay (Denis, 15 Oct 2026). Only the
   ways into the feed go: the Home item and any other link to /feed/. Shared
   posts (/feed/update/) and the post composer (shareActive) are not feed. */
a[href^="/feed"]:not([href*="/feed/update/"]):not([href*="shareActive"]),
a[href*="linkedin.com/feed"]:not([href*="/feed/update/"]):not([href*="shareActive"]) {
  display: none !important;
}

/* Anything a sweep decided to hide stays hidden even when the page moves it. */
[data-unfeed-hidden] {
  display: none !important;
}
`;

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
  var linkedin_default2 = {
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
    const rules = file.rules.map((entry, index) => {
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
    if (!rules.some((rule) => rule.match.kind === "any")) fail(site, "rules must include an any fallback");
    return {
      site,
      hosts: file.hosts.map((host) => host.toLowerCase()),
      allowedHostSuffixes: allowedHostSuffixes.map((suffix) => suffix.toLowerCase()),
      allowedHostPaths,
      alwaysAllowHosts: alwaysAllowHosts.map((host) => host.toLowerCase()),
      rules
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
    instagram: parseSiteRules(instagram_default, "instagram"),
    linkedin: parseSiteRules(linkedin_default2, "linkedin")
  };
  function decide(site, rawUrl, context, settings) {
    const rules = RULES[site];
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
    if (!rules.hosts.includes(host)) {
      if (rules.allowedHostSuffixes.some((suffix) => hostMatches(host, suffix))) {
        return { action: "allow", rule: "asset-host" };
      }
      if (rules.alwaysAllowHosts.some((entry) => hostMatches(host, entry))) {
        return { action: "allow", rule: "short-link-host" };
      }
      for (const entry of rules.allowedHostPaths) {
        if (hostMatches(host, entry.host) && path.startsWith(entry.path)) {
          return { action: "allow", rule: "host-path" };
        }
      }
      return { action: "external", rule: "outside-host" };
    }
    for (const rule of rules.rules) {
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
  function enforceRoute(site, settings, href) {
    try {
      const declared = globalThis.__UNFEED_CONTEXT__;
      const context = typeof declared === "string" && declared ? declared : "page";
      const result = decide(site, href, context, settings);
      if (result.action !== "redirect" || !result.to) return;
      const target = new URL(result.to, location.origin).href;
      if (target !== location.href) window.location.replace(target);
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
        if (config.enforce) enforceRoute(site, settings, url);
        apply();
      };
      installRouteHooks(win, onRoute);
      if (config.unread) watchUnread(post);
    } catch (error) {
      post({ type: "inject-error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  // src/inject/linkedin.ts
  var HIDDEN_ATTR = "data-unfeed-hidden";
  function isHidden(element) {
    return element.getAttribute(HIDDEN_ATTR) !== null;
  }
  function hide(element) {
    element.setAttribute(HIDDEN_ATTR, "");
  }
  function hideAllMatching(root, selector) {
    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
      if (!isHidden(node)) hide(node);
    }
  }
  function isOnSearchPage() {
    return location.pathname.toLowerCase().startsWith("/search/results");
  }
  function isOnProfilePage() {
    return location.pathname.toLowerCase().startsWith("/in/");
  }
  var hideSearchPosts = () => {
    var _a, _b, _c, _d;
    if (!isOnSearchPage()) return;
    for (const chip of document.querySelectorAll("button, a")) {
      if (isHidden(chip)) continue;
      if (((_a = chip.textContent) != null ? _a : "").trim().toLowerCase() === "posts") hide(chip);
    }
    for (const heading of document.querySelectorAll("h1, h2, h3")) {
      if (((_b = heading.textContent) != null ? _b : "").trim().toLowerCase() === "posts") {
        hide((_d = (_c = heading.closest("section")) != null ? _c : heading.closest("div")) != null ? _d : heading);
      }
    }
  };
  var PROFILE_HEADING_TEXTS = ["more profiles for you", "people you may know"];
  var hideProfileSuggestions = () => {
    var _a, _b, _c;
    if (!isOnProfilePage()) return;
    for (const heading of document.querySelectorAll("h1, h2, h3")) {
      if (isHidden(heading)) continue;
      const text = ((_a = heading.textContent) != null ? _a : "").trim().toLowerCase();
      if (!PROFILE_HEADING_TEXTS.includes(text)) continue;
      hide((_c = (_b = heading.closest("section")) != null ? _b : heading.closest("div")) != null ? _c : heading);
    }
  };
  function hideTightContainer(trigger) {
    var _a;
    let node = trigger;
    for (let hop = 0; node !== null && hop < 5; hop += 1) {
      const parent = node.parentElement;
      node = parent;
      if (node === null) break;
      if (((_a = node.textContent) != null ? _a : "").trim().length <= 160) {
        hide(node);
        return;
      }
    }
    hide(trigger);
  }
  var OPEN_APP_PATTERN = /\b(open|use|get|try|download|install|switch to|continue in|view in|see (this|it) in)\b.{0,24}\bapp\b|\bbetter (on|in) the app\b|\blinkedin app\b/i;
  var APP_LINK = 'a[href*="apps.apple.com"], a[href*="itunes.apple.com"], a[href*="play.google.com"], a[href^="linkedin:"], a[href^="voyager:"], a[href^="intent:"], a[href*=".app.link"], a[href*="onelink.me"]';
  var DIALOG = '[role="dialog"], [role="alertdialog"], dialog, [aria-modal="true"]';
  var DISMISS_PATTERN = /^(not now|dismiss|close|no thanks|maybe later|cancel|stay on (the )?(mobile )?(web|site|browser|website)|continue (on|in|with) (the )?(mobile )?(browser|web|website))\b/i;
  function isAppPromptText(text) {
    return text.length <= 80 && OPEN_APP_PATTERN.test(text);
  }
  function isAppPromptDialog(dialog) {
    var _a;
    const text = ((_a = dialog.textContent) != null ? _a : "").trim();
    return text.length <= 600 && (OPEN_APP_PATTERN.test(text) || dialog.querySelector(APP_LINK) !== null);
  }
  function dismissButton(dialog) {
    var _a, _b, _c;
    for (const button of dialog.querySelectorAll('button, [role="button"], a')) {
      const label = `${(_a = button.getAttribute("aria-label")) != null ? _a : ""} ${((_b = button.textContent) != null ? _b : "").trim()}`.trim();
      if (DISMISS_PATTERN.test(label) || /^(dismiss|close)\b/i.test((_c = button.getAttribute("aria-label")) != null ? _c : "")) {
        if (button instanceof HTMLElement) return button;
      }
    }
    return null;
  }
  function closeAppDialog(dialog) {
    if (dialog.getAttribute("data-unfeed-dismissed") !== null) {
      hideDialogWithBackdrop(dialog);
      return;
    }
    dialog.setAttribute("data-unfeed-dismissed", "");
    const button = dismissButton(dialog);
    if (button) button.click();
    else hideDialogWithBackdrop(dialog);
  }
  function hideDialogWithBackdrop(dialog) {
    var _a, _b;
    let target = dialog;
    let node = dialog.parentElement;
    const text = ((_a = dialog.textContent) != null ? _a : "").trim();
    while (node && node !== document.body && ((_b = node.textContent) != null ? _b : "").trim() === text) {
      target = node;
      node = node.parentElement;
    }
    hide(target);
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
  var hideBannersAndUpsells = () => {
    var _a, _b, _c;
    for (const banner of document.querySelectorAll('[role="banner"]')) {
      if (isHidden(banner) || banner.matches("header")) continue;
      if (OPEN_APP_PATTERN.test((_a = banner.textContent) != null ? _a : "")) hide(banner);
    }
    for (const dialog of document.querySelectorAll(DIALOG)) {
      if (isHidden(dialog) || dialog.closest(`[${HIDDEN_ATTR}]`)) continue;
      if (isAppPromptDialog(dialog)) closeAppDialog(dialog);
    }
    for (const trigger of document.querySelectorAll('a, button, [role="button"]')) {
      if (isHidden(trigger) || trigger.closest(`[${HIDDEN_ATTR}]`) || trigger.closest(DIALOG)) continue;
      const text = ((_b = trigger.textContent) != null ? _b : "").trim();
      if (isAppPromptText(text) || trigger.matches(APP_LINK)) {
        hideTightContainer(trigger);
        continue;
      }
      const href = (_c = trigger.getAttribute("href")) != null ? _c : "";
      if (href.startsWith("/premium/")) hideTightContainer(trigger);
    }
  };
  var COUNT_PATTERN = /^\d[\d,]*(\.\d+)?\+?\s*(followers|connections)$/i;
  var hideCountTexts = (settings) => {
    var _a;
    if (!settings.hideCounts) return;
    for (const element of document.querySelectorAll("span, div, p")) {
      if (isHidden(element) || element.children.length > 0) continue;
      if (COUNT_PATTERN.test(((_a = element.textContent) != null ? _a : "").trim())) hide(element);
    }
  };
  function inSiteBar(element) {
    let node = element;
    for (let hop = 0; node !== null && hop < 8; hop += 1) {
      if (["NAV", "HEADER", "FOOTER"].includes(node.tagName) || node.getAttribute("role") === "navigation") return true;
      const position = getComputedStyle(node).position;
      if (position === "fixed" || position === "sticky") return true;
      node = node.parentElement;
    }
    return false;
  }
  var hideHomeItem = () => {
    var _a;
    for (const item of document.querySelectorAll('a, button, [role="link"], [role="button"], [role="tab"]')) {
      if (isHidden(item)) continue;
      if (((_a = item.textContent) != null ? _a : "").trim().toLowerCase() !== "home") continue;
      if (inSiteBar(item)) hide(item);
    }
  };
  function isFeedPage(pathname) {
    return pathname.toLowerCase().replace(/\/{2,}/g, "/").replace(/\/?$/, "/") === "/feed/";
  }
  var hideFeedBehindComposer = () => {
    if (!isFeedPage(location.pathname)) return;
    hideAllMatching(
      document,
      '[data-urn^="urn:li:activity"], [data-urn^="urn:li:share"], [data-urn^="urn:li:ugcPost"], [data-id^="urn:li:activity"]'
    );
  };
  var COMPOSER_EDITOR = '[contenteditable="true"], textarea, [role="textbox"]';
  var COMPOSER_GONE_MS = 1500;
  var COMPOSER_NEVER_SHOWED_MS = 12e3;
  function composerSession() {
    var _a;
    const scope = globalThis;
    return scope.__UNFEED_LI_COMPOSER__ = (_a = scope.__UNFEED_LI_COMPOSER__) != null ? _a : {
      open: false,
      since: 0,
      sawEditor: false,
      lastEditorAt: 0,
      previousContext: void 0
    };
  }
  function setPageContext(value) {
    globalThis.__UNFEED_CONTEXT__ = value;
  }
  var trackComposer = (_settings, post) => {
    const state = composerSession();
    const path = location.pathname.toLowerCase().replace(/\/?$/, "/");
    const onFeed = path === "/feed/";
    if (onFeed && new URLSearchParams(location.search).has("shareActive") && !state.open) {
      state.open = true;
      state.since = Date.now();
      state.sawEditor = false;
      state.previousContext = globalThis.__UNFEED_CONTEXT__;
      setPageContext("composer");
      post({ type: "li-composer", open: true });
    }
    if (!state.open) return;
    const close = (backToMessages) => {
      state.open = false;
      setPageContext(state.previousContext);
      post({ type: "li-composer", open: false });
      if (backToMessages) window.location.replace(new URL("/messaging/", location.origin).href);
    };
    if (!onFeed) {
      close(false);
      return;
    }
    const now = Date.now();
    if (document.querySelector(COMPOSER_EDITOR)) {
      state.sawEditor = true;
      state.lastEditorAt = now;
      return;
    }
    const waited = now - (state.sawEditor ? state.lastEditorAt : state.since);
    if (waited > (state.sawEditor ? COMPOSER_GONE_MS : COMPOSER_NEVER_SHOWED_MS)) close(true);
  };
  var OWN_PROFILE_EDIT = /\/in\/([^/?#]+)\/edit\//;
  var detectOwnProfile = (_settings, post) => {
    var _a, _b, _c;
    if (!isOnProfilePage()) return;
    const scope = globalThis;
    const state = scope.__UNFEED_LI__ = (_a = scope.__UNFEED_LI__) != null ? _a : {};
    for (const anchor of document.querySelectorAll('a[href*="/in/"][href*="/edit/"]')) {
      const match = OWN_PROFILE_EDIT.exec((_b = anchor.getAttribute("href")) != null ? _b : "");
      const vanity = (_c = match == null ? void 0 : match[1]) == null ? void 0 : _c.toLowerCase();
      if (!vanity || vanity === "me") continue;
      const url = `https://www.linkedin.com/in/${vanity}/`;
      if (state.postedProfile === url) return;
      state.postedProfile = url;
      post({ type: "li-own-profile", url });
      return;
    }
  };
  setupInject("linkedin", {
    css: linkedin_default,
    sweeps: [
      hideSearchPosts,
      hideProfileSuggestions,
      hideBannersAndUpsells,
      hideCountTexts,
      hideHomeItem,
      hideFeedBehindComposer,
      trackComposer,
      detectOwnProfile
    ],
    unread: true,
    enforce: true
  });
})();
