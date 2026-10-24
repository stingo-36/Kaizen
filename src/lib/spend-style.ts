/* Category colour + icon, ported from SpendWise (src/lib/palette.ts) so a category reads the same in both apps. */
import { C } from './theme';

const EXPENSE: Record<string, [string, string]> = {
  emi: ['#D2534B', 'emi'], food: ['#E0813C', 'food'], bills: ['#C9A22B', 'bills'], sip: ['#6279B5', 'sip'],
  house: ['#6476A5', 'house'], transport: ['#3D7FC1', 'transport'], shopping: ['#6E5BC6', 'shopping'],
  leisure: ['#B0559C', 'shopping'], health: ['#CC5F86', 'health'], other: ['#6D7484', 'other'], uncategorized: ['#8A909C', 'other'],
};
const INCOME: Record<string, [string, string]> = {
  salary: ['#3459E6', 'salary'], bonus: ['#6279B5', 'bonus'], extra: ['#6476A5', 'extra'], refund: ['#5E8FD0', 'refund'],
  interest: ['#7A6FD0', 'sip'], transfers: ['#6E7BC6', 'transfers'],
};
const EXPENSE_FALLBACK = ['#B0559C', '#6279B5', '#3D7FC1', '#E0813C', '#6E5BC6', '#C9A22B', '#6476A5', '#CC5F86'];
const INCOME_FALLBACK = ['#3459E6', '#6476A5', '#6279B5', '#5E8FD0', '#7A6FD0', '#7894C6'];

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

export type CatStyle = { solid: string; soft: string; ink: string; icon: string };
/** Category accents on Kaizen's light surfaces. */
export function categoryStyle(name: string | null | undefined, isExpense = true): CatStyle {
  const key = (name ?? 'uncategorized').trim().toLowerCase();
  const known = EXPENSE[key] ?? INCOME[key];
  const pool = isExpense ? EXPENSE_FALLBACK : INCOME_FALLBACK;
  const [solid, icon] = known ?? [pool[hash(key) % pool.length], isExpense ? 'other' : 'salary'];
  return { solid, icon, soft: mix(solid, C.card, 0.86), ink: mix(solid, '#000000', 0.28) };
}
