// The Unfeed shell (T1 tracer): dark header with the app switcher pill, the
// Instagram host showing DMs, and the Instagram bottom bar. Real tab
// navigation, stories button and LinkedIn side arrive in T2 and T3.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppSwitcher, type AppKey } from '@/components/AppSwitcher';
import { BottomBar, type BottomTab } from '@/components/BottomBar';
import { Header } from '@/components/Header';
import { IconChat, IconPerson, IconSearch } from '@/components/icons';
import { InstagramHost } from '@/hosts/InstagramHost';
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

  const handleSelectApp = (app: AppKey) => {
    // The LinkedIn host and its tabs arrive with T3; until then the pill
    // renders both apps but only Instagram switches.
    if (app === 'instagram') setActiveApp(app);
  };

  return (
    <View style={styles.fill}>
      <Header center={<AppSwitcher active={activeApp} onSelect={handleSelectApp} />} />
      <InstagramHost context={activeTab} settings={DEFAULT_SETTINGS} />
      <BottomBar tabs={INSTAGRAM_TABS} active={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});
