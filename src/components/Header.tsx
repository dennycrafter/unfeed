// The app's own top bar (Denis, 25 Oct 2026), the same on Instagram and
// LinkedIn: frosted dark, full width, a thin line under it. Left slot for the
// page tools (Link, and QR on LinkedIn), the app switcher pill centred, the
// Settings gear on the right. BarButton is the one icon button every slot
// uses, so all of them share size, spacing and the selected look.

import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bars, colors, radius, space } from '../theme/tokens';

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
        <View style={[styles.side, styles.sideLeft]}>{left}</View>
        <View style={styles.center}>{center}</View>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

interface BarButtonProps {
  label: string;
  onPress: () => void;
  active?: boolean;
  /** Draws the icon in the colour the button picks for its state. */
  icon: (color: string) => ReactNode;
}

export function BarButton({ label, onPress, active = false, icon }: BarButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.button, active && styles.buttonActive]}
      hitSlop={4}
    >
      {icon(active ? colors.silver : colors.muted)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    // Frosted look approximated with near opaque dark: expo-blur is not in
    // the charter library list (section 3).
    backgroundColor: colors.bar,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: bars.top, paddingHorizontal: space.sm },
  // Room for two buttons on each side, so the pill stays truly centred.
  side: { width: bars.hit * 2 + space.xs, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sideLeft: { justifyContent: 'flex-start' },
  sideRight: { justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  button: {
    width: bars.hit,
    height: bars.hit,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: { backgroundColor: colors.surface2 },
});
