// Video sound inside the web views (Denis, 23 Oct 2026): DM videos played
// with no sound because the app's audio followed the iPhone's silent switch.
// Setting the audio mode once at launch makes web view video sound play like
// it does in the Instagram app, mixing with other audio instead of stopping it.

import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

export async function allowSoundInSilentMode(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  } catch (error) {
    console.warn('[unfeed] could not set the audio mode', error);
  }
}
