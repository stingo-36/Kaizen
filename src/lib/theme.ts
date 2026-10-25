/** Cobalt Studio: one light palette across Android, iOS and web. */
export const C = {
  bg: '#F5F6FB', card: '#FFFFFF', soft: '#EDF0FC',
  ink: '#1C2136', onInk: '#FFFFFF', muted: '#69728A', faint: '#858EA4',
  line: '#E5E8F1', field: '#D4DAE9', track: '#E7EBF7',
  accent: '#3459E6', accent2: '#7894F1', accentSoft: '#E0E7FF',
  accentTint: '#F0F3FF', accentInk: '#253E9B',
  hero: '#1D2B63', heroEnd: '#354E9D', onHero: '#FFFFFF', heroMuted: '#C7D4FF',
  lavender: '#EEEDFD', lavenderInk: '#6853B5',
  // Compatibility token: completion is cobalt, never green.
  green: '#3459E6', danger: '#B83E40', dangerSoft: '#FFF0F0',
  white: '#FFFFFF', onWhite: '#253E9B',
  bar: '#FFFFFF', barOn: '#3459E6', barOnInk: '#FFFFFF', barInk: '#69728A',
  glass: 'rgba(255,255,255,0.72)',
  heat1: '#E0E7FF', heat2: '#ACBEF5', heat3: '#6885E8',
  // Compatibility tokens for the WorkNest components, now lavender.
  tealSoft: '#EEEDFD', teal: '#6853B5',
};

/** Quiet icon and category accents; large surfaces remain neutral. */
export const PASTEL: [string, string][] = [
  ['#EDF1FF', '#3459E6'], ['#F1EDFF', '#6853B5'], ['#EDF0F7', '#40567E'],
  ['#EEEDFD', '#6853B5'], ['#F2EEFC', '#6250A4'],
];
export const TONES: [string, string][] = [
  ...PASTEL, ['#EAF0FD', '#385B9C'], ['#F3EDFA', '#77559A'], ['#EEF0F6', '#53627E'],
];
export const toneOf = (n: number): [string, string] => TONES[((n % TONES.length) + TONES.length) % TONES.length];

export function themed<T extends object>(make: () => T): T { return make(); }

/** One neutral family for screen titles, body copy, forms and chart labels. */
export const F = {
  r: 'Roboto_400Regular',
  m: 'Roboto_500Medium',
  s: 'Roboto_600SemiBold',
  b: 'Roboto_700Bold',
};

export const R = { card: 20, pill: 999, tile: 18, btn: 13, field: 13 };

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
