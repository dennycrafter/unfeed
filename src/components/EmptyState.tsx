// Empty and loading states (charter section 10): one muted line of text and,
// when useful, one quiet button.

import { StyleSheet, Text, TouchableOpacity, View, type ViewProps } from 'react-native';
import { colors, radius } from '../theme/tokens';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** An optional quiet text button under the main one. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  style?: ViewProps['style'];
}

export function EmptyState({ message, actionLabel, onAction, secondaryLabel, onSecondary, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <TouchableOpacity onPress={onSecondary} accessibilityRole="button" accessibilityLabel={secondaryLabel}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  button: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: { color: colors.silver, fontSize: 13 },
  secondaryText: { color: colors.muted, fontSize: 13, paddingVertical: 4 },
});
