// The native stories screen (Denis, 25 Oct 2026): a row of story circles
// drawn by the app from what the hidden tray reader found on Instagram home.
// Instagram home itself never shows. Tapping a circle opens that person's
// stories in the visible web view. When the tray cannot be read the screen
// says so plainly instead of falling back to the page.

import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/tokens';
import { EmptyState } from './EmptyState';

export interface StoryCircle {
  username: string;
  avatar: string | null;
}

/** loading: the reader is still looking. ready: circles to show. empty: the
 * tray was read and had nothing, or never turned up. login: Instagram asked
 * for a login instead of showing home. */
export type StoriesStatus = 'loading' | 'ready' | 'empty' | 'login';

interface StoriesTrayProps {
  status: StoriesStatus;
  items: StoryCircle[];
  onOpen: (username: string) => void;
  onRetry: () => void;
  onClose: () => void;
}

const CIRCLE = 68;

function Circle({ item, onOpen }: { item: StoryCircle; onOpen: (username: string) => void }) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onOpen(item.username)}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${item.username}'s story`}
    >
      <View style={styles.ring}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.initialWrap]}>
            <Text style={styles.initial}>{item.username.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );
}

export function StoriesTray({ status, items, onOpen, onRetry, onClose }: StoriesTrayProps) {
  const showCircles = items.length > 0;
  return (
    <View style={styles.fill} testID="stories-tray">
      <Text style={styles.title} accessibilityRole="header">
        Stories
      </Text>
      {showCircles ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            style={styles.rowScroll}
          >
            {items.map((item) => (
              <Circle key={item.username} item={item} onOpen={onOpen} />
            ))}
          </ScrollView>
          <Text style={styles.hint}>
            {status === 'loading' ? 'Checking for new stories...' : 'Tap a circle to watch. No feed here.'}
          </Text>
        </>
      ) : status === 'loading' ? (
        <EmptyState message="Loading stories..." />
      ) : status === 'login' ? (
        <EmptyState
          message="Log in to Instagram first. Open the DMs tab, log in there, then come back."
          actionLabel="Try again"
          onAction={onRetry}
          secondaryLabel="Close"
          onSecondary={onClose}
        />
      ) : (
        <EmptyState
          message="No stories to show right now."
          actionLabel="Try again"
          onAction={onRetry}
          secondaryLabel="Close"
          onSecondary={onClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.fg, fontSize: 17, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  rowScroll: { flexGrow: 0 },
  row: { paddingHorizontal: 12, paddingVertical: 12, gap: 14 },
  item: { width: CIRCLE + 8, alignItems: 'center', gap: 6 },
  ring: {
    width: CIRCLE + 6,
    height: CIRCLE + 6,
    borderRadius: (CIRCLE + 6) / 2,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: colors.surface2 },
  initialWrap: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.silver, fontSize: 24, fontWeight: '600' },
  name: { color: colors.fg, fontSize: 12, maxWidth: CIRCLE + 8 },
  hint: { color: colors.muted, fontSize: 13, paddingHorizontal: 16, paddingTop: 4 },
});
