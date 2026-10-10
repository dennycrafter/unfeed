import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { hydrateSettings } from '@/state/store';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  // Read the stored settings once at launch (charter section 6); every
  // screen then reads the same snapshot from the shared store.
  useEffect(() => {
    void hydrateSettings();
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
