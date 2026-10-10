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
