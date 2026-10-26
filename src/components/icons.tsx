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

/** The settings gear: eight square teeth around a ring with a round hole,
 * so it reads as Settings at a glance (the old spoked one looked like a sun,
 * Denis 25 Oct 2026). The outline is generated, not traced from any app. */
export const GEAR_OUTLINE =
  'M10.22 4.82 L10.36 2.14 L13.64 2.14 L13.78 4.82 L15.82 5.66 L17.81 3.86 L20.14 6.19 L18.34 8.18 L19.18 10.22 L21.86 10.36 L21.86 13.64 L19.18 13.78 L18.34 15.82 L20.14 17.81 L17.81 20.14 L15.82 18.34 L13.78 19.18 L13.64 21.86 L10.36 21.86 L10.22 19.18 L8.18 18.34 L6.19 20.14 L3.86 17.81 L5.66 15.82 L4.82 13.78 L2.14 13.64 L2.14 10.36 L4.82 10.22 L5.66 8.18 L3.86 6.19 L6.19 3.86 L8.18 5.66 Z';

export function IconGear({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={GEAR_OUTLINE} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3.1" stroke={color} strokeWidth="1.6" />
    </Svg>
  );
}

/** The Link button: two linked rounded loops. */
export function IconLink({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l3.1-3.1a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-3.1 3.1a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The Notifications tab: a plain bell. */
export function IconBell({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Back: a plain chevron pointing left. */
export function IconBack({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
