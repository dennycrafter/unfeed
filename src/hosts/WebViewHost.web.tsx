// Web stand in for react-native-webview, which has no web support (gotcha 8).
// It runs the same route guard and renders a placeholder panel saying which
// URL the native WebView would load, so the shell can be screenshotted from
// the web export.

import { StyleSheet, Text, View } from 'react-native';
import { decide, toAbsoluteUrl } from '../rules/decide';
import { colors, radius } from '../theme/tokens';
import type { WebViewHostProps } from './types';

export function WebViewHost({ site, url, context, settings, placeholderLabel }: WebViewHostProps) {
  const result = decide(site, url, context, settings);
  const displayUrl = result.action === 'redirect' ? toAbsoluteUrl(site, result.to ?? '/') : url;
  const siteLabel = site === 'instagram' ? 'Instagram' : 'LinkedIn';
  return (
    <View style={styles.fill}>
      <View style={styles.panel} testID="webview-placeholder">
        <Text style={styles.kicker}>{placeholderLabel ?? `${siteLabel} in the native WebView`}</Text>
        <Text style={styles.url}>{displayUrl}</Text>
        <Text style={styles.note}>
          {`Route guard: ${result.action}${result.to ? ` to ${result.to}` : ''} | tab: ${context}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
    maxWidth: 320,
  },
  kicker: { color: colors.muted, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  url: { color: colors.silver, fontSize: 15, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12 },
});
