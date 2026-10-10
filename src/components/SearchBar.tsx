// Native LinkedIn search bar (charter section 8.6): 6px corners, sits on the
// page background, and shows the last 10 searches as plain text rows while
// it is focused. Submitting hands the keywords to the host.

import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

interface SearchBarProps {
  recents: string[];
  onSubmit: (keywords: string) => void;
}

export function SearchBar({ recents, onSubmit }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const showRecents = focused && recents.length > 0;

  const submit = (query: string): void => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue(trimmed);
    setFocused(false);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Search people"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => submit(value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search people"
      />
      {showRecents ? (
        <View style={styles.recents} accessibilityLabel="Recent searches">
          {recents.map((recent) => (
            <TouchableOpacity
              key={recent}
              style={styles.recentRow}
              // onPressIn so the row wins over the blur that hides the list.
              onPressIn={() => submit(recent)}
            >
              <Text style={styles.recentText} numberOfLines={1}>
                {recent}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  input: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.fg,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 14,
  },
  recents: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.box,
    marginTop: 6,
    overflow: 'hidden',
  },
  recentRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  recentText: { color: colors.muted, fontSize: 13 },
});
