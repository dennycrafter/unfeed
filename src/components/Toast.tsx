// The toast (charter section 10): one short line at the bottom on surface2
// with the 1px line outline and the pop-up shadow. The caller owns the
// message and clears it; the toast only shows what it is given.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps): ReactNode {
  if (message === null) return null;
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.card}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 24,
    // Pop-up shadow from section 10: 0 6px 16px rgba(0,0,0,.3).
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  text: { color: colors.fg, fontSize: 13 },
});
