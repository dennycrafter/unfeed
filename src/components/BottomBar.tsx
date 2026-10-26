// The app's own tab bar (Denis, 25 Oct 2026), the same on Instagram and
// LinkedIn: frosted dark with a thin line on top, 24pt icons over small
// labels, the active tab silver with a short white line above it. Tabs that
// are actions (Post) never become the active one.

import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bars, colors, space, type } from '../theme/tokens';

export interface BottomTab<K extends string = string> {
  key: K;
  label: string;
  icon: (color: string) => ReactNode;
}

interface BottomBarProps<K extends string = string> {
  tabs: BottomTab<K>[];
  active: K | null;
  onSelect?: (key: K) => void;
}

export function BottomBar<K extends string = string>({ tabs, active, onSelect }: BottomBarProps<K>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}
      accessibilityRole="tablist"
      accessibilityLabel="Tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? colors.silver : colors.muted;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab`}
            onPress={() => onSelect?.(tab.key)}
          >
            <View style={[styles.marker, isActive && styles.markerActive]} />
            {tab.icon(color)}
            <Text style={[styles.label, { color }, isActive && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: bars.tab - space.sm, paddingTop: space.sm },
  marker: { position: 'absolute', top: 0, width: 24, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  markerActive: { backgroundColor: colors.white },
  label: { fontSize: type.tab, letterSpacing: 0.2 },
  labelActive: { fontWeight: '600' },
});
