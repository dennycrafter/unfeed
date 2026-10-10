// The app switcher pill (charter sections 4 and 10): the one place a pill is
// allowed, centred in the header, words not logos, unread as a small dot.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/tokens';

export type AppKey = 'instagram' | 'linkedin';

const LABELS: Record<AppKey, string> = { instagram: 'Instagram', linkedin: 'LinkedIn' };

interface AppSwitcherProps {
  active: AppKey;
  unread?: Partial<Record<AppKey, number>>;
  onSelect?: (app: AppKey) => void;
}

export function AppSwitcher({ active, unread, onSelect }: AppSwitcherProps) {
  return (
    <View style={styles.pill} accessibilityRole="tablist" accessibilityLabel="App switcher">
      {(Object.keys(LABELS) as AppKey[]).map((app) => {
        const isActive = app === active;
        const count = unread?.[app] ?? 0;
        return (
          <TouchableOpacity
            key={app}
            style={[styles.segment, isActive && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${LABELS[app]}${count > 0 ? `, ${count} unread` : ''}`}
            onPress={() => onSelect?.(app)}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelMuted]}>
              {LABELS[app]}
            </Text>
            {count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  segmentActive: { backgroundColor: colors.line },
  label: { fontSize: 13, fontWeight: '600' },
  labelActive: { color: colors.fg },
  labelMuted: { color: colors.muted },
  badge: {
    backgroundColor: colors.info,
    borderRadius: 999,
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
  },
  badgeText: { color: colors.bg, fontSize: 10, fontWeight: '700' },
});
