/* Category icons with related warm accents from Kaizen’s orange and ivory palette. */
import { C } from './theme';

const EXPENSE: Record<string, [string, string]> = {
  emi: ['#B4472A', 'emi'], food: ['#C96F31', 'food'], bills: ['#A97928', 'bills'], sip: ['#906641', 'sip'],
  house: ['#7C6857', 'house'], transport: ['#A3572D', 'transport'], shopping: ['#985139', 'shopping'],
  leisure: ['#A3654C', 'shopping'], health: ['#B15D48', 'health'], other: ['#74675E', 'other'], uncategorized: ['#88796C', 'other'],
};
const INCOME: Record<string, [string, string]> = {
  salary: ['#D5360C', 'salary'], bonus: ['#906641', 'bonus'], extra: ['#7C6857', 'extra'], refund: ['#B77C4C', 'refund'],
  interest: ['#8C6143', 'sip'], transfers: ['#9C7354', 'transfers'],
};
const EXPENSE_FALLBACK = ['#A3654C', '#906641', '#A3572D', '#C96F31', '#985139', '#A97928', '#7C6857', '#B15D48'];
const INCOME_FALLBACK = ['#D5360C', '#7C6857', '#906641', '#B77C4C', '#8C6143', '#BC8B60'];

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
