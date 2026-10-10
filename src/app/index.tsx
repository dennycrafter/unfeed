// The Unfeed shell (T3): dark header with the app switcher pill and both
// hosts kept mounted (charter section 4). Switching apps only flips which
// host is visible, so both WebViews keep their state. Unread dots and
// lastApp persistence arrive with T5.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { Header } from '@/components/Header';
import { IconChat, IconPerson, IconSearch } from '@/components/icons';
import { InstagramHost } from '@/hosts/InstagramHost';
import { LinkedInHost } from '@/hosts/LinkedInHost';
import { DEFAULT_SETTINGS } from '@/state/settings';
import { colors } from '@/theme/tokens';

const INSTAGRAM_TABS: BottomTab[] = [
  { key: 'search', label: 'Search', icon: (color) => <IconSearch color={color} /> },
  { key: 'dms', label: 'DMs', icon: (color) => <IconChat color={color} /> },
  { key: 'profile', label: 'Profile', icon: (color) => <IconPerson color={color} /> },
];

export default function Index() {
  const [activeApp, setActiveApp] = useState<AppKey>('instagram');
  const [activeTab, setActiveTab] = useState('dms');

  return (
    <View style={styles.fill}>
      <Header center={<AppSwitcher active={activeApp} onSelect={setActiveApp} />} />
      <View style={[styles.hostArea, activeApp !== 'instagram' && styles.hidden]}>
        <InstagramHost context={activeTab} settings={DEFAULT_SETTINGS} />
        <BottomBar tabs={INSTAGRAM_TABS} active={activeTab} onSelect={setActiveTab} />
      </View>
      <View style={[styles.hostArea, activeApp !== 'linkedin' && styles.hidden]}>
        {/* QR screen, profile link saving and settings wiring land in T4/T5. */}
        <LinkedInHost settings={DEFAULT_SETTINGS} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hostArea: { flex: 1 },
  hidden: { display: 'none' },
});
