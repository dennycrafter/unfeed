// Native bottom bar (charter section 10): surface2, 1px top line, 24px icons
// with small labels, active item silver with a 2px white bar above it.

import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

export interface BottomTab {
  key: string;
  label: string;
  icon: (color: string) => ReactNode;
}

interface BottomBarProps {
  tabs: BottomTab[];
  active: string;
  onSelect?: (key: string) => void;
}

export function BottomBar({ tabs, active, onSelect }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
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
            {isActive ? <View style={styles.activeBar} /> : null}
            {tab.icon(color)}
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  activeBar: {
    position: 'absolute',
    top: -9,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.white,
  },
  label: { fontSize: 10 },
});
