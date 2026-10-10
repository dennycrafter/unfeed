// Design tokens from charter section 10. Four greys, one accent reserved for
// the single main action per screen, small corners, system font.

export const colors = {
  bg: '#0b0b0d',
  surface: '#121215',
  surface2: '#1c1c20',
  line: '#2a2a30',
  fg: '#f2f2f4',
  muted: '#9a9aa3',
  silver: '#e8e8ea',
  accent: '#2ee6a6',
  accentInk: '#7ff5cc',
  ok: '#34d65c',
  warn: '#ffb547',
  bad: '#ff6f66',
  info: '#6ab8ff',
  white: '#ffffff',
} as const;

export const radius = { box: 8, control: 6 } as const;
