// Design tokens from charter section 10 and Denis's clean dark UI rules.
// Four greys (page, box, inner surface, outline), one accent reserved for the
// single main action per screen, small corners, system font. Tightened on
// 25 Oct 2026 for the app's own bars: one spacing scale, one type scale and
// fixed bar heights, shared by every native screen and the injected page CSS.

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
  /** The frosted top and bottom bars: the page colour, nearly opaque. */
  bar: 'rgba(11, 11, 13, 0.94)',
} as const;

export const radius = { box: 8, control: 6 } as const;

/** Spacing in points. Every gap and padding comes from here. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Text sizes in points: tab labels, small print, body, screen titles. */
export const type = { tab: 10, small: 12, body: 15, title: 17 } as const;

/** The app's own bars, the same on Instagram and LinkedIn. */
export const bars = { top: 48, tab: 52, icon: 24, hit: 40 } as const;

/** The font the injected page CSS asks for, matching the native system font. */
export const pageFont = '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif';
