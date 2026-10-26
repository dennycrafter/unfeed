// Native WebView host (charter sections 4, 8.1, 8.2 and 8.6). One WebView per
// site, route guard wired into all three navigation surfaces, a thin 2px
// loading bar under the header line (section 10), and the imperative handle
// for the tab behaviour (scroll to top on a re-press, Android back).

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewNavigation,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';
import * as Linking from 'expo-linking';
import { parsePageMessage } from '../inject/protocol';
import { buildSettingsPreamble } from '../inject/settingsPreamble';
import { decide, toAbsoluteUrl, type DecideResult, type Site } from '../rules/decide';
import { isReturnablePage, returnTarget } from '../rules/returnRules';
import { recordBounce } from '../state/bounceLog';
import { colors } from '../theme/tokens';
import { loadDecision } from './loadDecision';
import type { WebViewHostApi, WebViewHostProps } from './types';

export const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function percentWidth(fraction: number): `${number}%` {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return `${Math.round(clamped * 100)}%` as `${number}%`;
}

/** Keeps the bounce for the Blocked pages list in Settings. */
function logBounce(site: Site, url: string, result: DecideResult, target: string): void {
  const ruleTarget = toAbsoluteUrl(site, result.to ?? '/');
  // A return to the last page is logged with that page, so the list shows
  // where the page really went.
  recordBounce({ at: Date.now(), site, url, rule: result.rule ?? 'unknown', to: target === ruleTarget ? result.to : target });
}

export const WebViewHost = forwardRef<WebViewHostApi, WebViewHostProps>(function WebViewHost(
  { site, url, context, homeUrl = null, settings, hideCounts = false, injectScript, onMessage, scrollToTopSignal = 0, style, placeholderLabel },
  ref,
) {
  const webViewRef = useRef<WebView<object> | null>(null);
  const [source, setSource] = useState(url);
  const sourceRef = useRef(url);
  sourceRef.current = source;
  const [progress, setProgress] = useState(0);
  const canGoBackRef = useRef(false);
  // The last allowed page and the latest page address, for returns and for
  // the delayed native backup redirect below.
  const lastGoodRef = useRef<string | null>(null);
  const lastRouteRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs keep the latest tab context and settings visible inside callbacks
  // without resubscribing the WebView handler props on every render.
  const contextRef = useRef(context);
  contextRef.current = context;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const homeUrlRef = useRef(homeUrl);
  homeUrlRef.current = homeUrl;

  // Only a new address from the shell moves the page. The shell never feeds
  // back the page's own address, so the page never reloads under Denis.
  useEffect(() => {
    setSource(url);
  }, [url]);

  useEffect(
    () => () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollTop() {
        webViewRef.current?.injectJavaScript('window.scrollTo(0, 0); true;');
      },
      goBack() {
        webViewRef.current?.goBack();
      },
      canGoBack() {
        return canGoBackRef.current;
      },
      clearCache() {
        webViewRef.current?.clearCache(true);
      },
      runScript(code: string) {
        webViewRef.current?.injectJavaScript(`${code}; true;`);
      },
      setContext(next: string) {
        contextRef.current = next;
      },
      open(target: string) {
        if (sourceRef.current === target) {
          webViewRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(target)}); true;`);
        } else {
          setSource(target);
        }
      },
    }),
    [],
  );

  const runGuard = useCallback(
    (rawUrl: string): DecideResult => decide(site, rawUrl, contextRef.current, settingsRef.current),
    [site],
  );

  /** Where a redirect lands: home and feed rules go back to the last page of
   * this tab (src/rules/returnRules.ts), the rest to the rule's target. */
  const targetFor = useCallback(
    (result: DecideResult, blockedUrl: string): string | null => {
      if (result.action !== 'redirect') return null;
      const ruleTarget = toAbsoluteUrl(site, result.to ?? '/');
      const target = returnTarget(result.rule, ruleTarget, lastGoodRef.current, homeUrlRef.current, blockedUrl);
      return target === blockedUrl ? null : target;
    },
    [site],
  );

  /** Moves the page to a redirect target without a second load: a new
   * address goes through the source, the same address through the page. */
  const goTo = useCallback((target: string): void => {
    if (sourceRef.current === target) {
      webViewRef.current?.injectJavaScript(`window.location.replace(${JSON.stringify(target)}); true;`);
    } else {
      setSource(target);
    }
  }, []);

  const cancelFallback = useCallback((): void => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  /** The injected script enforces in-page moves itself. Native only steps in
   * if the page is still on the blocked address a moment later, so a
   * redirect never runs twice and reloads the page. */
  const scheduleFallback = useCallback(
    (blockedUrl: string, result: DecideResult): void => {
      cancelFallback();
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        if (lastRouteRef.current !== blockedUrl) return;
        const target = targetFor(result, blockedUrl);
        if (!target) return;
        logBounce(site, blockedUrl, result, target);
        webViewRef.current?.injectJavaScript(`window.location.replace(${JSON.stringify(target)}); true;`);
      }, 900);
    },
    [cancelFallback, site, targetFor],
  );

  const openOutside = useCallback((rawUrl: string) => {
    Linking.openURL(rawUrl).catch((error: unknown) => {
      console.warn(`[unfeed] could not open ${rawUrl} outside the app`, error);
    });
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      if (request.isTopFrame !== false) {
        canGoBackRef.current = request.canGoBack;
        // A real load is under way: the backup redirect is not needed.
        cancelFallback();
      }
      const result = runGuard(request.url);
      const decision = loadDecision(result, {
        isTopFrame: request.isTopFrame,
        navigationType: request.navigationType,
        platform: Platform.OS,
      });
      if (decision === 'load') return true;
      if (decision === 'open-outside') {
        openOutside(request.url);
        return false;
      }
      const target = targetFor(result, request.url);
      if (target) {
        logBounce(site, request.url, result, target);
        goTo(target);
      }
      return false;
    },
    [cancelFallback, goTo, openOutside, runGuard, site, targetFor],
  );

  const handleNavigationStateChange = useCallback(
    (state: WebViewNavigation): void => {
      canGoBackRef.current = state.canGoBack;
      if (state.loading) return;
      lastRouteRef.current = state.url;
      const result = runGuard(state.url);
      if (result.action === 'redirect') scheduleFallback(state.url, result);
    },
    [runGuard, scheduleFallback],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      const message = parsePageMessage(String(event.nativeEvent.data));
      if (!message) return;
      if (message.type === 'route') {
        lastRouteRef.current = message.url;
        const result = runGuard(message.url);
        if (result.action === 'allow') {
          cancelFallback();
          if (isReturnablePage(message.url)) lastGoodRef.current = message.url;
        } else if (result.action === 'redirect') {
          scheduleFallback(message.url, result);
        } else if (result.action === 'external') {
          openOutside(message.url);
        }
      } else if (message.type === 'bounce') {
        recordBounce({ at: Date.now(), site, url: message.url, rule: message.rule, to: message.to });
      }
      onMessageRef.current?.(message);
    },
    [cancelFallback, openOutside, runGuard, scheduleFallback, site],
  );

  // iOS can drop a page that sat in the background to save memory, which
  // leaves it blank. Load it again where it was.
  const handleContentProcessDidTerminate = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  const handleLoadProgress = useCallback((event: WebViewProgressEvent) => {
    setProgress(event.nativeEvent.progress);
  }, []);

  const handleLoadEnd = useCallback(() => setProgress(0), []);

  // The page reads the settings and the tab context that caused this load
  // before the main script runs (charter sections 8.4 and 8.5).
  const script = useMemo(
    () => buildSettingsPreamble({ allowSharedPosts: settings.allowSharedPosts, hideCounts }, context, homeUrl) + injectScript,
    [context, hideCounts, homeUrl, injectScript, settings.allowSharedPosts],
  );

  // A second press on the active tab scrolls the page to the top (section
  // 8.6); the imperative scrollTop covers shells that hold the ref instead.
  useEffect(() => {
    if (scrollToTopSignal > 0) webViewRef.current?.injectJavaScript('window.scrollTo(0, 0); true;');
  }, [scrollToTopSignal]);

  return (
    <View style={[styles.fill, style]}>
      {/* react-native-webview 14 types collapse the default generic to never, so name an empty prop extension. */}
      <WebView<object>
        ref={webViewRef}
        testID={`webview-${site}`}
        source={{ uri: source }}
        style={styles.fill}
        userAgent={IPHONE_USER_AGENT}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        // Off on purpose (Denis, 26 Oct 2026): scrolling up through a DM
        // thread kept pulling the page into a reload.
        pullToRefreshEnabled={false}
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={script}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onLoadProgress={handleLoadProgress}
        onLoadEnd={handleLoadEnd}
        onContentProcessDidTerminate={handleContentProcessDidTerminate}
      />
      {progress > 0 && progress < 1 ? (
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: percentWidth(progress) }]} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  progressFill: { height: 2, backgroundColor: colors.silver },
});
