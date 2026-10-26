import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { allowSoundInSilentMode } from '@/state/audio';
import { hydrateBounces } from '@/state/bounceLog';
import { hydrateSettings } from '@/state/store';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  // Read the stored settings once at launch (charter section 6); every
  // screen then reads the same snapshot from the shared store.
  useEffect(() => {
    void hydrateSettings();
    // The Blocked pages list in Settings (Denis, 25 Oct 2026).
    void hydrateBounces();
    // Videos in the web views play with sound even on silent (Denis, 23 Oct).
    void allowSoundInSilentMode();
  }, []);

  return (
    <SafeAreaProvider style={styles.provider}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: { flex: 1, backgroundColor: colors.bg },
});
