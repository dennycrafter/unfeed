// Camera scanner (charter section 8.7): a plain permission explainer first,
// then a qr-only CameraView. The duplicate guard ignores repeat reads of the
// same code for 2 seconds, and a good scan ticks the haptic when enabled.
// Only the device can verify the camera itself; the device-only steps live in
// DENIS_TODO.md.

import { useCallback, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { createScanGate } from './scanGate';
import { colors, radius } from '../theme/tokens';

interface ScannerProps {
  haptics: boolean;
  onResult: (data: string) => void;
}

export function Scanner({ haptics, onResult }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mountError, setMountError] = useState<string | null>(null);
  const gate = useMemo(() => createScanGate(), []);

  const handleRequest = useCallback((): void => {
    requestPermission().catch((error: unknown) => {
      console.warn('[unfeed] camera permission request failed', error);
    });
  }, [requestPermission]);

  const handleScanned = useCallback(
    (data: string): void => {
      if (!gate.accept(data)) return;
      if (haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
          console.warn('[unfeed] haptic failed', error);
        });
      }
      onResult(data);
    },
    [gate, haptics, onResult],
  );

  if (!permission) {
    return <Text style={styles.note}>Checking camera permission...</Text>;
  }

  // The system said no for good: only the phone Settings can change it now.
  if (!permission.granted && permission.canAskAgain === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission is off</Text>
        <Text style={styles.note}>
          Turn the camera on for this app in the phone Settings, then come back here.
        </Text>
        <TouchableOpacity
          style={styles.accentButton}
          onPress={() => {
            Linking.openSettings().catch((error: unknown) => {
              console.warn('[unfeed] could not open settings', error);
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
        >
          <Text style={styles.accentText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Scan a QR code</Text>
        <Text style={styles.note}>
          Unfeed uses the camera only to read QR codes. Nothing is recorded and nothing is uploaded.
        </Text>
        <TouchableOpacity
          style={styles.accentButton}
          onPress={handleRequest}
          accessibilityRole="button"
          accessibilityLabel="Allow camera"
        >
          <Text style={styles.accentText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => handleScanned(data)}
        onMountError={({ message }) => setMountError(message)}
        accessibilityLabel="Camera view scanning for QR codes"
      />
      <View style={styles.hintWrap} pointerEvents="none">
        <Text style={styles.hint}>Point the camera at a QR code</Text>
      </View>
      {mountError ? (
        <Text style={styles.error} accessibilityLabel="Camera error">
          {mountError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { color: colors.fg, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  note: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  accentButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  accentText: { color: colors.bg, fontSize: 14, fontWeight: '600' },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  hint: {
    color: colors.silver,
    fontSize: 13,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  error: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 60,
    color: colors.bad,
    fontSize: 13,
    textAlign: 'center',
  },
});
