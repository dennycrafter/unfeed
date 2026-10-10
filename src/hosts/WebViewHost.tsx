// Native WebView host (charter sections 4, 8.1 and 8.2). One WebView per
// site, route guard wired into all three navigation surfaces, and a thin 2px
// loading bar under the header line (section 10).

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewNavigation,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';
import * as Linking from 'expo-linking';
import { parsePageMessage } from '../inject/protocol';
import { decide, toAbsoluteUrl, type DecideResult, type Site } from '../rules/decide';
import { colors } from '../theme/tokens';
import type { WebViewHostProps } from './types';

export const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function percentWidth(fraction: number): `${number}%` {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return `${Math.round(clamped * 100)}%` as `${number}%`;
}

/** Returns the redirect target, or null when the guard allows or the request
 * is already on the target (which would loop). */
function redirectTarget(site: Site, result: DecideResult, requestedUrl: string): string | null {
  if (result.action !== 'redirect') return null;
  const target = toAbsoluteUrl(site, result.to ?? '/');
  return requestedUrl === target ? null : target;
}

export function WebViewHost({ site, url, context, settings, injectScript, onMessage, style }: WebViewHostProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [source, setSource] = useState(url);
  const [progress, setProgress] = useState(0);

  // Refs keep the latest tab context and settings visible inside callbacks
  // without resubscribing the WebView handler props on every render.
  const contextRef = useRef(context);
  contextRef.current = context;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    setSource(url);
  }, [url]);

  const runGuard = useCallback(
    (rawUrl: string): DecideResult => decide(site, rawUrl, contextRef.current, settingsRef.current),
    [site],
  );

  const openOutside = useCallback((rawUrl: string) => {
    Linking.openURL(rawUrl).catch((error: unknown) => {
      console.warn(`[unfeed] could not open ${rawUrl} outside the app`, error);
    });
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const result = runGuard(request.url);
      if (result.action === 'allow') return true;
      if (result.action === 'external') {
        openOutside(request.url);
        return false;
      }
      const target = redirectTarget(site, result, request.url);
      if (target) setSource(target);
      return false;
    },
    [openOutside, runGuard, site],
  );

  const handleNavigationStateChange = useCallback(
    (state: WebViewNavigation): void => {
      const target = redirectTarget(site, runGuard(state.url), state.url);
      if (target) setSource(target);
    },
    [runGuard, site],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      const message = parsePageMessage(String(event.nativeEvent.data));
      if (!message) return;
      if (message.type === 'route') {
        const result = runGuard(message.url);
        if (result.action === 'redirect') {
          const target = toAbsoluteUrl(site, result.to ?? '/');
          // Single page navigation never fires shouldStartLoad, so the
          // in page replace is how a redirect is enforced here (gotcha 2).
          webViewRef.current?.injectJavaScript(`window.location.replace(${JSON.stringify(target)}); true;`);
        } else if (result.action === 'external') {
          openOutside(message.url);
        }
      }
      onMessageRef.current?.(message);
    },
    [openOutside, runGuard, site],
  );

  const handleLoadProgress = useCallback((event: WebViewProgressEvent) => {
    setProgress(event.nativeEvent.progress);
  }, []);

  const handleLoadEnd = useCallback(() => setProgress(0), []);

  return (
    <View style={[styles.fill, style]}>
      <WebView
        ref={webViewRef}
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
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={injectScript}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onLoadProgress={handleLoadProgress}
        onLoadEnd={handleLoadEnd}
      />
      {progress > 0 && progress < 1 ? (
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: percentWidth(progress) }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  progressFill: { height: 2, backgroundColor: colors.silver },
});
