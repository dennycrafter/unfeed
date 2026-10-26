// The settings screen (charter sections 8.8 and 10): rows in boxes with thin
// dividers, one section per app and one for the shared behaviour, a reset to
// defaults, and the About line. Every change saves straight to the shared
// store, so the shell and the WebViews pick it up at once. Settings has no
// accent main action (section 10), destructive rows use the bad colour.

import { useEffect, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Toast } from '@/components/Toast';
import { requestSiteLogout, resetSettings, updateSettings, useSettings } from '@/state/store';
import { colors, radius } from '@/theme/tokens';
import type { Site } from '@/rules/decide';

interface ConfirmSpec {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (next: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.line, true: colors.ok }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function TextRow({
  label,
  placeholder,
  value,
  keyboardType,
  onChange,
  onCommit,
}: {
  label: string;
  placeholder: string;
  value: string;
  keyboardType?: 'default' | 'url';
  onChange: (next: string) => void;
  onCommit: (next: string) => void;
}) {
  return (
    <View style={styles.textRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        returnKeyType="done"
        onChangeText={onChange}
        onEndEditing={(event) => onCommit(event.nativeEvent.text)}
      />
    </View>
  );
}

function QuietButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.quietButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.quietButtonText, danger && styles.dangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ConfirmDialog({ spec, onCancel }: { spec: ConfirmSpec; onCancel: () => void }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{spec.title}</Text>
          <Text style={styles.dialogBody}>{spec.body}</Text>
          <View style={styles.dialogRow}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogCancel]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogButton}
              onPress={spec.onConfirm}
              accessibilityRole="button"
              accessibilityLabel={spec.confirmLabel}
            >
              <Text style={[styles.dialogConfirmText, styles.dangerText]}>{spec.confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const settings = useSettings();
  // Drafts hold what is typed; null means show the stored value.
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const commitUsername = (text: string): void => {
    setUsernameDraft(null);
    if (text.trim() === (settings.igUsername ?? '')) return;
    updateSettings({ igUsername: text });
  };

  const commitProfileUrl = (text: string): void => {
    setProfileDraft(null);
    if (text.trim() === (settings.liProfileUrl ?? '')) return;
    updateSettings({ liProfileUrl: text });
  };

  const askLogout = (site: Site): void => {
    const name = site === 'instagram' ? 'Instagram' : 'LinkedIn';
    setConfirm({
      title: `Log out of ${name}`,
      body: 'The app signs this account out here. You can log back in with your username and password.',
      confirmLabel: 'Log out',
      onConfirm: () => {
        setConfirm(null);
        requestSiteLogout(site);
        setToast(`Signing out of ${name}. Log back in with your username and password.`);
      },
    });
  };

  const askReset = (): void => {
    setConfirm({
      title: 'Reset to defaults',
      body: 'Every setting goes back to how it started. Your logins are not touched.',
      confirmLabel: 'Reset',
      onConfirm: () => {
        setConfirm(null);
        setUsernameDraft(null);
        setProfileDraft(null);
        resetSettings();
        setToast('Settings back to defaults.');
      },
    });
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to the app"
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionLabel>Instagram</SectionLabel>
        <View style={styles.box}>
          <TextRow
            label="Instagram username"
            placeholder="your username"
            value={usernameDraft ?? settings.igUsername ?? ''}
            onChange={setUsernameDraft}
            onCommit={commitUsername}
            keyboardType="default"
          />
          <Divider />
          <View style={styles.row}>
            <QuietButton label="Log out of Instagram" danger onPress={() => askLogout('instagram')} />
          </View>
        </View>

        <SectionLabel>LinkedIn</SectionLabel>
        <View style={styles.box}>
          <TextRow
            label="LinkedIn profile link"
            placeholder="https://www.linkedin.com/in/you/"
            value={profileDraft ?? settings.liProfileUrl ?? ''}
            onChange={setProfileDraft}
            onCommit={commitProfileUrl}
            keyboardType="url"
          />
          <Divider />
          <View style={styles.row}>
            <QuietButton label="Log out of LinkedIn" danger onPress={() => askLogout('linkedin')} />
          </View>
        </View>

        <SectionLabel>Both apps</SectionLabel>
        <View style={styles.box}>
          {/* Single posts and reels always open now (Denis, 25 Oct 2026), so the
              old shared posts switch is gone. */}
          <ToggleRow
            label="Hide like and follower counts"
            value={settings.hideCounts}
            onToggle={(next) => updateSettings({ hideCounts: next })}
          />
          <Divider />
          <ToggleRow label="Haptics" value={settings.haptics} onToggle={(next) => updateSettings({ haptics: next })} />
        </View>

        <View style={styles.box}>
          <QuietButton label="Reset to defaults" danger onPress={askReset} />
        </View>

        <Text style={styles.about}>
          About Unfeed{'\n'}Version {version}
        </Text>
      </ScrollView>
      <Toast message={toast} />
      {confirm ? <ConfirmDialog spec={confirm} onCancel={() => setConfirm(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: 'rgba(11, 11, 13, 0.92)',
  },
  backButton: { minWidth: 64, paddingHorizontal: 8, paddingVertical: 8 },
  backText: { color: colors.silver, fontSize: 15 },
  title: { color: colors.fg, fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 6, paddingBottom: 48 },
  sectionLabel: { color: colors.muted, fontSize: 12, marginTop: 12, marginBottom: 4, letterSpacing: 0.4 },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, minHeight: 48 },
  textRow: { padding: 14, gap: 4 },
  rowLabel: { color: colors.fg, fontSize: 15 },
  input: {
    color: colors.fg,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  quietButton: { paddingVertical: 6, paddingHorizontal: 4 },
  quietButtonText: { color: colors.silver, fontSize: 15 },
  dangerText: { color: colors.bad },
  about: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  dialogTitle: { color: colors.fg, fontSize: 17, fontWeight: '700' },
  dialogBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  dialogRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  dialogButton: { borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 8 },
  dialogCancel: { backgroundColor: colors.surface },
  dialogCancelText: { color: colors.silver, fontSize: 14, fontWeight: '600' },
  dialogConfirmText: { fontSize: 14, fontWeight: '600' },
});
