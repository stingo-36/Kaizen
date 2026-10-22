/* Light and dark palettes. `C` and `PASTEL` are swapped in place by applyScheme(), and every
   StyleSheet is wrapped in themed() so it is rebuilt at the same moment; the root then remounts
   the screens so nothing keeps the old colours. */

const LIGHT = {
  bg: '#FBFBFB',
  card: '#FFFFFF',
  soft: '#F3F4F3',
  ink: '#2F2F2F',
  /** Text and icons on an ink-coloured surface (primary buttons, selected chips). */
  onInk: '#FFFFFF',
  muted: '#677782',
  faint: '#AEB4B7',
  line: '#ECEDEC',
  field: '#DDDFDD',
  track: '#EEF0EF',
  /** Muted modern indigo accent. */
  accent: '#5B5FC7',
  accentSoft: '#E6E7F5',
  accentTint: '#F4F4FA',
  green: '#3F9A64',
  danger: '#D9534F',
  dangerSoft: '#FCEBEA',
  /** Always white: text on the accent colour and photos. */
  white: '#FFFFFF',
  /** Always dark: text on a white button. */
  onWhite: '#2F2F2F',
  /** Tab bar. */
  bar: '#2F2F2F',
  barOn: '#FFFFFF',
  barOnInk: '#2F2F2F',
  barInk: 'rgba(255,255,255,0.62)',
  /** Frosted circle behind icons on pastel tiles. */
  glass: 'rgba(255,255,255,0.7)',
  /** Heatmap shades, lightest first. */
  heat1: '#D9DAF2',
  heat2: '#ABADE5',
  heat3: '#8084D6',
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
};

export const C: Palette = { ...LIGHT };

/** Pastel card tones (background, ink). Same slots in both modes, so code can keep references to them. */
const PASTEL_LIGHT: [string, string][] = [
  ['#DCEFCF', '#2F3D24'], ['#FCEBB6', '#4A3A10'], ['#D6E4F6', '#1F3550'], ['#E6E0F8', '#33295A'], ['#FDDCD2', '#5A2A1C'],
];
const PASTEL_DARK: [string, string][] = [
  ['#22301C', '#BFE3A8'], ['#352C12', '#F5D77A'], ['#1A2738', '#A9C8F0'], ['#272140', '#CBBDF5'], ['#3A2119', '#F7B7A3'],
];
export const PASTEL: [string, string][] = PASTEL_LIGHT.map(([a, b]) => [a, b]);

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
  r: 'Geist_400Regular',
  m: 'Geist_500Medium',
  s: 'Geist_600SemiBold',
  b: 'Geist_700Bold',
};

export const R = { card: 22, pill: 999, tile: 14 };

/** Type scale used across screens. */
export const TY = {
  /** Tab and screen titles. */
  title: 26,
  /** Hero headlines and big numbers on cards. */
  hero: 22,
  /** Headings inside cards. */
  head: 16,
  /** List item names. */
  item: 15,
  body: 14,
  sub: 13,
  cap: 12,
};
/** Spacing: between sections on a screen, and between cards side by side. */
export const SP = { section: 22, grid: 12, pad: 18 };
