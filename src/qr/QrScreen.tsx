// QR screen (charter section 8.7): two segments, Scan and My code, with the
// scan result in a bottom sheet. The ?scan= and ?profile= router params
// prefill the sheet and My code for the web preview screenshots and double as
// a deep link seam (assumption 21 in ASSUMPTIONS.md).

import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { classifyCode, type ScanPayload } from './classifyCode';
import { MyCode } from './MyCode';
import { Scanner } from './Scanner';
import { colors, radius } from '../theme/tokens';

type Segment = 'scan' | 'code';

interface QrScreenProps {
  profileUrl: string | null;
  haptics: boolean;
  onOpenLinkedInUrl: (url: string) => void;
  onOpenInstagramUrl: (url: string) => void;
  /** Loads /in/me/ so the vanity detection can save the own profile link. */
  onFindProfile: () => void;
}

interface SheetAction {
  label: string;
  kind: 'primary' | 'quiet';
  onPress: () => void;
}

interface SheetContent {
  title: string;
  detail: string;
  actions: SheetAction[];
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function QrScreen({
  profileUrl,
  haptics,
  onOpenLinkedInUrl,
  onOpenInstagramUrl,
  onFindProfile,
}: QrScreenProps) {
  const [segment, setSegment] = useState<Segment>('scan');
  const params = useLocalSearchParams<{ scan?: string | string[]; profile?: string | string[] }>();
  const previewScan = firstParam(params.scan);
  const previewProfile = firstParam(params.profile);
  // The sheet payload is initialized from the ?scan= param at mount; deep
  // links and web loads always arrive as a fresh mount, so no effect is
  // needed (assumption 21 in ASSUMPTIONS.md).
  const [result, setResult] = useState<ScanPayload | null>(() =>
    previewScan ? classifyCode(previewScan) : null,
  );

  const close = useCallback((): void => setResult(null), []);

  const copy = useCallback((text: string): void => {
    Clipboard.setStringAsync(text).catch((error: unknown) => {
      console.warn('[unfeed] could not copy', error);
    });
  }, []);

  const handleScanResult = useCallback((data: string): void => {
    setResult(classifyCode(data));
  }, []);

  const openInBrowser = useCallback((url: string): void => {
    Linking.openURL(url).catch((error: unknown) => {
      console.warn(`[unfeed] could not open ${url} in the browser`, error);
    });
  }, []);

  const sheetContent = (payload: ScanPayload): SheetContent => {
    switch (payload.kind) {
      case 'linkedin':
        return {
          title: payload.vanity ? 'LinkedIn profile' : 'LinkedIn link',
          detail: payload.url,
          actions: [
            {
              label: 'Open in LinkedIn',
              kind: 'primary',
              onPress: () => {
                close();
                onOpenLinkedInUrl(payload.url);
              },
            },
            { label: 'Copy', kind: 'quiet', onPress: () => copy(payload.url) },
          ],
        };
      case 'instagram':
        return {
          title: 'Instagram link',
          detail: payload.url,
          actions: [
            {
              label: 'Open in Instagram',
              kind: 'primary',
              onPress: () => {
                close();
                onOpenInstagramUrl(payload.url);
              },
            },
            { label: 'Copy', kind: 'quiet', onPress: () => copy(payload.url) },
          ],
        };
      case 'url':
        return {
          title: 'Link',
          detail: payload.url,
          actions: [
            {
              label: 'Open in browser',
              kind: 'primary',
              onPress: () => {
                close();
                openInBrowser(payload.url);
              },
            },
            { label: 'Copy', kind: 'quiet', onPress: () => copy(payload.url) },
          ],
        };
      case 'text':
        return {
          title: 'Scanned text',
          detail: payload.text,
          actions: [{ label: 'Copy', kind: 'primary', onPress: () => copy(payload.text) }],
        };
    }
  };

  const sheet = result ? sheetContent(result) : null;

  return (
    <View style={styles.fill}>
      <View style={styles.segments} accessibilityRole="tablist" accessibilityLabel="QR sections">
        {(['scan', 'code'] as const).map((key) => {
          const label = key === 'scan' ? 'Scan' : 'My code';
          const active = segment === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} segment`}
              onPress={() => setSegment(key)}
            >
              <Text style={[styles.segmentText, active ? styles.segmentActiveText : null]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {segment === 'scan' ? (
        <Scanner haptics={haptics} onResult={handleScanResult} />
      ) : (
        <MyCode profileUrl={previewProfile ?? profileUrl} onFindProfile={onFindProfile} />
      )}

      {sheet ? (
        <View style={styles.sheetBackdrop} pointerEvents="box-none">
          <View style={styles.sheet} testID="scan-result-sheet" accessibilityLabel="Scan result">
            <Text style={styles.sheetTitle}>{sheet.title}</Text>
            <Text style={styles.sheetDetail} numberOfLines={3}>
              {sheet.detail}
            </Text>
            <View style={styles.sheetActions}>
              {sheet.actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.sheetButton, action.kind === 'primary' ? styles.primaryButton : null]}
                  onPress={action.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text
                    style={[
                      styles.sheetButtonText,
                      action.kind === 'primary' ? styles.primaryButtonText : null,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.sheetButton}
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Close scan result"
              >
                <Text style={styles.sheetButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  segments: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentActive: { backgroundColor: colors.surface2 },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  segmentActiveText: { color: colors.silver },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.surface2,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: colors.line,
    margin: 12,
    padding: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetTitle: { color: colors.fg, fontSize: 15, fontWeight: '600' },
  sheetDetail: { color: colors.muted, fontSize: 13 },
  sheetActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  sheetButton: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sheetButtonText: { color: colors.silver, fontSize: 13, fontWeight: '600' },
  primaryButtonText: { color: colors.bg },
});
