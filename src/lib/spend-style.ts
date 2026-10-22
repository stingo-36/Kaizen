/* Category colour + icon, ported from SpendWise (src/lib/palette.ts) so a category reads the same in both apps. */
import { C, scheme } from './theme';

const EXPENSE: Record<string, [string, string]> = {
  emi: ['#D2534B', 'emi'], food: ['#E0813C', 'food'], bills: ['#C9A22B', 'bills'], sip: ['#3F9A5F', 'sip'],
  house: ['#2E8FA8', 'house'], transport: ['#3D7FC1', 'transport'], shopping: ['#6E5BC6', 'shopping'],
  leisure: ['#B0559C', 'shopping'], health: ['#CC5F86', 'health'], other: ['#6D7484', 'other'], uncategorized: ['#8A909C', 'other'],
};
const INCOME: Record<string, [string, string]> = {
  salary: ['#1F8A70', 'salary'], bonus: ['#4FA36B', 'bonus'], extra: ['#2E9BA8', 'extra'], refund: ['#5E8FD0', 'refund'],
  interest: ['#7A6FD0', 'sip'], transfers: ['#6E7BC6', 'transfers'],
};
const EXPENSE_FALLBACK = ['#B0559C', '#3F9A5F', '#3D7FC1', '#E0813C', '#6E5BC6', '#C9A22B', '#2E8FA8', '#CC5F86'];
const INCOME_FALLBACK = ['#2A8A69', '#2E9BA8', '#4FA36B', '#5E8FD0', '#7A6FD0', '#3F9D8C'];

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

export type CatStyle = { solid: string; soft: string; ink: string; icon: string };
/** The colour and icon for a SpendWise category. `soft`/`ink` follow light or dark mode. */
export function categoryStyle(name: string | null | undefined, isExpense = true): CatStyle {
  const key = (name ?? 'uncategorized').trim().toLowerCase();
  const known = EXPENSE[key] ?? INCOME[key];
  const pool = isExpense ? EXPENSE_FALLBACK : INCOME_FALLBACK;
  const [solid, icon] = known ?? [pool[hash(key) % pool.length], isExpense ? 'other' : 'salary'];
  const dark = scheme() === 'dark';
  return { solid, icon, soft: dark ? mix(solid, C.card, 0.78) : mix(solid, '#FFFFFF', 0.86), ink: dark ? mix(solid, '#FFFFFF', 0.35) : mix(solid, '#000000', 0.28) };
}

/** A deeper pastel card tone built from a SpendWise colour: [background, text]. */
export function toneOf(solid: string): [string, string] {
  return scheme() === 'dark' ? [mix(solid, C.card, 0.62), mix(solid, '#FFFFFF', 0.55)] : [mix(solid, '#FFFFFF', 0.7), mix(solid, '#000000', 0.5)];
}
