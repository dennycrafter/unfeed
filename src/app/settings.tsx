// Placeholder until T5 builds the real settings screen (charter section 8.8).
// The gear button needs somewhere to land today, so this renders the screen
// chrome with a short note.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <View style={styles.fill}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.box}>
        <Text style={styles.body}>The full settings screen arrives with ticket T5.</Text>
      </View>
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to the app"
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16 },
  title: { color: colors.fg, fontSize: 28, fontWeight: '700', marginTop: 8 },
  box: { backgroundColor: colors.surface, borderRadius: radius.box, borderWidth: 1, borderColor: colors.line, padding: 16 },
  body: { color: colors.muted, fontSize: 14 },
  back: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backText: { color: colors.fg, fontSize: 14, fontWeight: '600' },
});
