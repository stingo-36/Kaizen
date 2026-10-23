/* Light and dark palettes. `C` and `PASTEL` are swapped in place by applyScheme(), and every
   StyleSheet is wrapped in themed() so it is rebuilt at the same moment; the root then remounts
   the screens so nothing keeps the old colours. */

const LIGHT = {
  /** Cool off-white page; cards are flat white surfaces on it (no shadows). */
  bg: '#F4F6FC',
  card: '#FFFFFF',
  soft: '#EEF1FA',
  ink: '#121633',
  /** Text and icons on an ink-coloured surface (primary buttons, selected chips). */
  onInk: '#FFFFFF',
  muted: '#5A6180',
  /** Hints and outlines; 3:1 on white, so never body text. */
  faint: '#8B91AB',
  line: '#E6E9F4',
  field: '#D6DBEB',
  track: '#E8EBF7',
  /** Royal blue: the one accent, for primary actions, links, rings and the active tab. */
  accent: '#4361EE',
  /** Gradient partner for accent (rings and the featured card wash). */
  accent2: '#4CC9F0',
  accentSoft: '#E3E8FD',
  accentTint: '#F1F3FE',
  /** Text on accentSoft (featured cards). */
  accentInk: '#1B2470',
  green: '#1F9D55',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  /** Always white: text on the accent colour and photos. */
  white: '#FFFFFF',
  /** Always dark: text on a white button. */
  onWhite: '#2F2F2F',
  /** Tab bar. */
  bar: '#FFFFFF',
  barOn: '#E3E8FD',
  barOnInk: '#1B2470',
  barInk: '#5A6180',
  /** Frosted circle behind icons on pastel tiles. */
  glass: 'rgba(255,255,255,0.7)',
  /** Heatmap shades, lightest first. */
  heat1: '#E3E8FD',
  heat2: '#A5B4FA',
  heat3: '#5F79F2',
  /** WorkNest Tracker's own colour (teal), outside the five pastels. */
  tealSoft: '#D6EEEA',
  teal: '#1D4A45',
};
type Palette = typeof LIGHT;

const DARK: Palette = {
  bg: '#111214',
  card: '#1A1B1E',
  soft: '#24262A',
  ink: '#ECEDEE',
  onInk: '#151618',
  muted: '#9AA4AC',
  faint: '#5E656B',
  line: '#2A2C30',
  field: '#3A3D42',
  track: '#2A2C31',
  accent: '#7D81E6',
  accentSoft: '#2D2F52',
  accentTint: '#1E1F33',
  accentInk: '#DCE7FD',
  accent2: '#4CC9F0',
  green: '#5CC48A',
  danger: '#F07470',
  dangerSoft: '#3A2020',
  white: '#FFFFFF',
  onWhite: '#2F2F2F',
  bar: '#26282C',
  barOn: '#ECEDEE',
  barOnInk: '#151618',
  barInk: 'rgba(255,255,255,0.55)',
  glass: 'rgba(0,0,0,0.25)',
  heat1: '#2D2F52',
  heat2: '#44479A',
  heat3: '#6266C9',
  tealSoft: '#16302D',
  teal: '#9FD8CF',
};

export const C: Palette = { ...LIGHT };

/** Pastel card tones (background, ink). Same slots in both modes, so code can keep references to them. */
const PASTEL_LIGHT: [string, string][] = [
  ['#DDEFD3', '#2B4520'], ['#FCEDBF', '#56420C'], ['#DAE7F6', '#1E3858'], ['#E8E2F7', '#382B63'], ['#FFDFCF', '#6A2C12'],
];
const PASTEL_DARK: [string, string][] = [
  ['#22301C', '#BFE3A8'], ['#352C12', '#F5D77A'], ['#1A2738', '#A9C8F0'], ['#272140', '#CBBDF5'], ['#3A2119', '#F7B7A3'],
];
export const PASTEL: [string, string][] = PASTEL_LIGHT.map(([a, b]) => [a, b]);

/** Colourful tones (soft background, strong ink) for things that sit side by side in a list,
    so each habit, workout day or tab gets its own colour instead of one shared pastel. */
export const TONES: [string, string][] = [
  ['#DDF5E6', '#0B7A45'], ['#E1E8FF', '#2F4BD8'], ['#ECE5FF', '#6236D9'], ['#FFE3EC', '#C2255C'],
  ['#FFF0CC', '#946000'], ['#D7F5F3', '#0B7F7A'], ['#DDF1FF', '#0B6FB3'], ['#EDF7D2', '#4F7A0B'],
];
/** Stable tone for an index (an icon number, a position in a list…). */
export const toneOf = (n: number): [string, string] => TONES[((n % TONES.length) + TONES.length) % TONES.length];

export type Scheme = 'light' | 'dark';
export type ThemeMode = 'system' | Scheme;
let current: Scheme = 'light';
export const scheme = () => current;

const rebuilders: (() => void)[] = [];
/** Wrap a StyleSheet.create call so its colours follow the active scheme. */
export function themed<T extends object>(make: () => T): T {
  let cur = make();
  rebuilders.push(() => { cur = make(); });
  return new Proxy({} as T, {
    get: (_, k) => (cur as any)[k],
    has: (_, k) => k in cur,
    ownKeys: () => Reflect.ownKeys(cur),
    getOwnPropertyDescriptor: (_, k) => Object.getOwnPropertyDescriptor(cur, k),
  });
}

export function applyScheme(s: Scheme) {
  if (s === current) return;
  current = s;
  Object.assign(C, s === 'dark' ? DARK : LIGHT);
  (s === 'dark' ? PASTEL_DARK : PASTEL_LIGHT).forEach(([a, b], i) => { PASTEL[i][0] = a; PASTEL[i][1] = b; });
  rebuilders.forEach((f) => f());
}

export const F = {
  r: 'Outfit_400Regular',
  m: 'Outfit_500Medium',
  s: 'Outfit_600SemiBold',
  b: 'Outfit_700Bold',
};

export const R = { card: 22, pill: 999, tile: 18, btn: 16, field: 14 };

/** Type scale used across screens. */
export const TY = {
  /** Tab and screen titles. */
  title: 26,
  /** Hero headlines and big numbers on cards. */
  hero: 20,
  /** Headings inside cards. */
  head: 16,
  /** List item names. */
  item: 14,
  body: 14,
  sub: 13,
  cap: 12,
};
/** Spacing: between sections on a screen, and between cards side by side. */
export const SP = { section: 20, grid: 12, pad: 18, page: 20 };
