// Dark header (charter section 10): frosted dark, side slots for the stories
// button and settings gear that arrive with T2, switcher pill centred.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

interface HeaderProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function Header({ left, center, right }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>{center}</View>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // Frosted look approximated with near opaque dark: expo-blur is not in
    // the charter library list (section 3).
    backgroundColor: 'rgba(11, 11, 13, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8 },
  // Room for two 40px buttons (Link and Settings, QR and Post).
  side: { width: 80, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center' },
});
