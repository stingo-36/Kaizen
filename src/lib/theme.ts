/** Burnt orange, warm ivory and soft black; one light palette across the app. */
export const C = {
  bg: '#F5EDE0', card: '#FFFCF7', soft: '#EFE2D0',
  ink: '#101010', onInk: '#FFFCF7', muted: '#74675E', faint: '#7D7065',
  line: '#E6D5BD', field: '#CBBBAB', track: '#EADBC8',
  accent: '#D5360C', accent2: '#E97945', accentSoft: '#F6D8C7',
  accentTint: '#FBEEE4', accentInk: '#8F2B0F',
  hero: '#101010', heroEnd: '#35261E', onHero: '#FFFCF7', heroMuted: '#E6D5BD',
  lavender: '#EFE2D0', lavenderInk: '#795337',
  // Legacy token names keep all existing components on the warm palette.
  green: '#D5360C', danger: '#A32C22', dangerSoft: '#FBE7DF',
  white: '#FFFFFF', onWhite: '#8F2B0F',
  bar: '#FFFCF7', barOn: '#D5360C', barOnInk: '#FFFFFF', barInk: '#74675E',
  glass: 'rgba(255,252,247,0.78)',
  heat1: '#F6D8C7', heat2: '#E9A47C', heat3: '#D86A37',
  tealSoft: '#EFE2D0', teal: '#795337',
};

/** Related clay, sand, caramel and charcoal shades for small category accents. */
export const PASTEL: [string, string][] = [
  ['#F9E4D6', '#B83412'], ['#EFE2D0', '#795337'], ['#EAE4DD', '#5E5047'],
  ['#F3E5D2', '#8A592C'], ['#F1DDD4', '#964830'],
];
export const TONES: [string, string][] = [
  ...PASTEL, ['#F3E2C6', '#916120'], ['#EDE0D8', '#80513D'], ['#E9E3DC', '#61544A'],
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
