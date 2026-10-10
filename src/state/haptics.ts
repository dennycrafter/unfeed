// The light haptic tick (charter section 10): on tab change and a good scan,
// only when the user left haptics on in settings.

import * as Haptics from 'expo-haptics';

export function tickHaptic(enabled: boolean): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
    console.warn('[unfeed] haptic failed', error);
  });
}
