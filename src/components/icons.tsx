// Plain geometric icons drawn for Unfeed. Never copies of Instagram or
// LinkedIn artwork (charter section 10).

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface IconProps {
  color?: string;
  size?: number;
}

export function IconSearch({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6.25" stroke={color} strokeWidth="1.8" />
      <Path d="M15.5 15.5 20 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconChat({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5.5" width="17" height="11" rx="3" stroke={color} strokeWidth="1.8" />
      <Path d="M8 20.5 11 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPerson({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.5" r="3.75" stroke={color} strokeWidth="1.8" />
      <Path d="M4.5 19.5c1.8-4 13.2-4 15 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconQr({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="4" y="14" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="14.5" y="14.5" width="2.2" height="2.2" fill={color} stroke="none" />
      <Rect x="17.8" y="17.8" width="2.2" height="2.2" fill={color} stroke="none" />
    </Svg>
  );
}

/** The Post button: a plus inside a rounded square. */
export function IconPlus({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth="1.8" />
      <Path d="M12 8.5v7M8.5 12h7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

/** The stories ring button: a plain round ring with a small inner dot. */
export function IconStories({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.25" stroke={color} strokeWidth="1.8" />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

/** The Profile tab avatar placeholder (charter 8.6: shows a small circle). */
export function IconAvatar({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.25" stroke={color} strokeWidth="1.8" />
      <Circle cx="12" cy="9.75" r="2.75" stroke={color} strokeWidth="1.6" />
      <Path d="M6.4 18.2c1.6-2.6 9.6-2.6 11.2 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** The settings gear, drawn from simple strokes. */
export function IconGear({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.25" stroke={color} strokeWidth="1.8" />
      <Path
        d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.9 1.9M16.1 16.1 18 18M18 6l-1.9 1.9M7.9 16.1 6 18"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}
