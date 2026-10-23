// Paste a link (Denis, 23 Oct 2026): a small pop-up under the header where a
// shared Instagram or LinkedIn link opens inside Unfeed, so a friend's post
// and its comments show up without the feed or the get the app push.
// Charter section 10: pop-up on surface2 with the thin outline, the input on
// the page background, Open as the one accent action.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readPastedLink, type PastedLink } from '../link/pastedLink';
import { colors, radius } from '../theme/tokens';

interface LinkSheetProps {
  onOpen: (link: Exclude<PastedLink, { kind: 'none' }>) => void;
  onClose: () => void;
  /** Starting text, for the web preview screenshots. */
  initialText?: string;
}

const NOT_A_LINK = 'That is not an Instagram or LinkedIn link.';

export function LinkSheet({ onOpen, onClose, initialText = '' }: LinkSheetProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const open = (value: string): void => {
    const link = readPastedLink(value);
    if (link.kind === 'none') {
      setError(value.trim() ? NOT_A_LINK : 'Paste a link first.');
      return;
    }
    onOpen(link);
  };

  const paste = async (): Promise<void> => {
    try {
      const value = await Clipboard.getStringAsync();
      setText(value);
      setError(null);
      if (readPastedLink(value).kind !== 'none') open(value);
      else setError(value.trim() ? NOT_A_LINK : 'Nothing copied yet.');
    } catch {
      setError('Could not read what you copied. Paste it into the box instead.');
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} testID="link-sheet">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close link" />
      <View style={[styles.card, { top: insets.top + 56 }]} accessibilityViewIsModal>
        <Text style={styles.title}>Open a link</Text>
        <Text style={styles.hint}>An Instagram or LinkedIn link opens here, with no feed.</Text>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setError(null);
          }}
          onSubmitEditing={() => open(text)}
          placeholder="https://www.instagram.com/p/..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          style={styles.input}
          accessibilityLabel="Link"
        />
        {error ? (
          <View style={styles.errorRow}>
            <View style={styles.errorDot} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.quiet}>
            <Text style={styles.quietText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.actionsRight}>
            <TouchableOpacity onPress={() => void paste()} accessibilityRole="button" accessibilityLabel="Paste" style={styles.quiet}>
              <Text style={styles.quietText}>Paste</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => open(text)} accessibilityRole="button" accessibilityLabel="Open link" style={styles.main}>
              <Text style={styles.mainText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    padding: 16,
    backgroundColor: colors.surface2,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: { color: colors.fg, fontSize: 16, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 12 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    color: colors.fg,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bad, marginRight: 8 },
  errorText: { color: colors.fg, fontSize: 14, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  actionsRight: { flexDirection: 'row', alignItems: 'center' },
  quiet: { paddingHorizontal: 12, paddingVertical: 10 },
  quietText: { color: colors.muted, fontSize: 15 },
  main: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 4,
  },
  mainText: { color: colors.bg, fontSize: 15, fontWeight: '600' },
});
