// The placeholder over a page that has not painted yet (Denis, 21 Nov 2026):
// quiet grey rows on the app's dark background, like a list of chats, so a
// tab never shows a blank or white screen while its page loads.

import { StyleSheet, View } from 'react-native';
import { colors, space } from '../theme/tokens';

const ROWS = 7;

export function Skeleton() {
  return (
    <View style={styles.fill} pointerEvents="none" accessibilityLabel="Loading" testID="page-skeleton">
      {Array.from({ length: ROWS }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: `${55 + ((index * 17) % 30)}%` }]} />
            <View style={[styles.line, styles.short, { width: `${30 + ((index * 23) % 35)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    paddingTop: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.line },
  lines: { flex: 1, marginLeft: 12, gap: 8 },
  line: { height: 10, borderRadius: 5, backgroundColor: colors.line },
  short: { opacity: 0.6 },
});
