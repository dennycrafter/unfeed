// My code (charter section 8.7): the QR of the saved LinkedIn profile link,
// black on white with a 16px quiet zone, the link in muted text below and a
// Share link button. Without a saved link: an empty state that finds the
// profile first, or sends Denis to Settings to type it in.

import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { EmptyState } from '../components/EmptyState';
import { normalizeProfileUrl } from '../hosts/linkedinUrl';
import { colors, radius } from '../theme/tokens';

interface MyCodeProps {
  profileUrl: string | null;
  onFindProfile: () => void;
  onOpenSettings?: () => void;
}

export function MyCode({ profileUrl, onFindProfile, onOpenSettings }: MyCodeProps) {
  const link = profileUrl ? normalizeProfileUrl(profileUrl) : null;
  if (!link) {
    return (
      <EmptyState
        message="No LinkedIn profile link saved yet."
        actionLabel="Find my profile"
        onAction={onFindProfile}
        secondaryLabel={onOpenSettings ? 'Or type it in Settings' : undefined}
        onSecondary={onOpenSettings}
      />
    );
  }

  const share = (): void => {
    Share.share({ message: link }).catch((error: unknown) => {
      console.warn('[unfeed] share failed', error);
    });
  };

  return (
    <View style={styles.center}>
      <View style={styles.codeCard}>
        <QRCode
          value={link}
          size={240}
          color="black"
          backgroundColor="#ffffff"
          quietZone={16}
          testID="my-code-qr"
        />
      </View>
      <Text style={styles.url} numberOfLines={2}>
        {link}
      </Text>
      <TouchableOpacity
        style={styles.accentButton}
        onPress={share}
        accessibilityRole="button"
        accessibilityLabel="Share link"
      >
        <Text style={styles.accentText}>Share link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  codeCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.box,
    overflow: 'hidden',
  },
  url: { color: colors.muted, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  accentButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  accentText: { color: colors.bg, fontSize: 14, fontWeight: '600' },
});
