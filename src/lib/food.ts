import { Platform } from 'react-native';

import { restingKcalPerMin } from './calories';
import type { MealTemplate } from './planning';
import type { Profile } from './profile';

import * as cloud from './cloud';

/* Food search, free and without API keys:
   - Everyday foods and dishes live in the shared `foods` table in Neon: USDA FoodData Central (FNDDS + Foundation,
     public domain) plus common Indian staples. Filled and refreshed monthly by `npm run foods:sync`.
   - Packaged products come from Open Food Facts (no key). When someone logs one that isn't in Neon yet, it is saved
     there, so the database grows with what people actually eat. */

export type Macros = { kcal: number; p: number; c: number; f: number };
/** A household amount such as "1 medium", "1 cup" or "1 slice", with its weight for the maths. */
export type Portion = { label: string; g: number };
export type FoodItem = {
  id: string; name: string; brand: string; source: 'usda' | 'off' | 'quick';
  per100: Macros;
  portions?: Portion[];
  /** Older saved items had a single serving. */
  serving?: Portion | null;
};
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const MEALS: [Meal, string][] = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
export type FoodEntry = { id: string; meal: Meal; item: FoodItem; grams: number; at: number; qty?: number; unit?: string };
export type FoodData = { days: Record<string, FoodEntry[]>; recent: FoodItem[]; templates?: MealTemplate[] };
export const emptyFood = (): FoodData => ({ days: {}, recent: [] });

export const mealFor = (h = new Date().getHours()): Meal => (h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks');

/* ---------- maths ---------- */
const r1 = (n: number) => Math.round(n * 10) / 10;
export const macrosOf = (e: { item: FoodItem; grams: number }): Macros => {
  const k = e.grams / 100, m = e.item.per100;
  return { kcal: Math.round(m.kcal * k), p: r1(m.p * k), c: r1(m.c * k), f: r1(m.f * k) };
};
export const sumMacros = (list: { item: FoodItem; grams: number }[]): Macros =>
  list.reduce((a, e) => { const m = macrosOf(e); return { kcal: a.kcal + m.kcal, p: r1(a.p + m.p), c: r1(a.c + m.c), f: r1(a.f + m.f) }; }, { kcal: 0, p: 0, c: 0, f: 0 });

/** Daily targets: resting burn × activity from training days, adjusted for the goal. */
export function targets(p: Profile): Macros {
  const bmr = restingKcalPerMin(p) * 1440;
  const activity = Math.min(1.75, Math.max(1.3, 1.35 + (p.days - 3) * 0.05));
  const adj = p.goal === 'Lose fat' ? -450 : p.goal === 'Build muscle' ? 250 : 0;
  const kcal = Math.round((bmr * activity + adj) / 10) * 10;
  const w = p.weightKg || 70;
  const pg = Math.round(w * (p.goal === 'Lose fat' ? 2 : p.goal === 'Stay fit' ? 1.4 : 1.8));
  const fg = Math.round((kcal * 0.27) / 9);
  const cg = Math.max(50, Math.round((kcal - pg * 4 - fg * 9) / 4));
  return { kcal, p: pg, c: cg, f: fg };
}

/* ---------- portions ---------- */
const FRAC: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
export const fmtQty = (n: number) => {
  const w = Math.floor(n), f = +(n - w).toFixed(2);
  return f && FRAC[String(f)] ? `${w || ''}${FRAC[String(f)]}` : `${+n.toFixed(2)}`;
};
/** "1 cup, chopped (about 150 g)" → "cup, chopped"; keeps amounts like "½ cup". */
export const unitName = (label: string) => {
  const t = label.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  return (/^1\s+/.test(t) ? t.replace(/^1\s+/, '') : t).slice(0, 36) || 'serving';
};

// Everyday amounts offered when a food has no portion data of its own.
const HOUSEHOLD: Portion[] = [{ label: 'serving', g: 100 }, { label: 'bowl', g: 250 }, { label: 'cup', g: 240 }, { label: 'plate', g: 350 }, { label: 'tbsp', g: 15 }];

/** The food's own portions first, then household amounts it doesn't already have. */
export function portionsOf(item: FoodItem): Portion[] {
  const own = (item.portions?.length ? item.portions : item.serving ? [item.serving] : [])
    .map((p) => ({ label: unitName(p.label), g: p.g }))
    .filter((p) => !/\b(inch|oz|lb|fl)\b/i.test(p.label))
    // Whole items ("banana", "medium", "slice") read more naturally than cups and spoons, so they go first.
    .sort((x, y) => +/cup|tbsp|tsp|tablespoon|teaspoon/i.test(x.label) - +/cup|tbsp|tsp|tablespoon|teaspoon/i.test(y.label));
  const seen = new Set(own.map((p) => p.label.toLowerCase()));
  return [...own, ...HOUSEHOLD.filter((h) => !seen.has(h.label) && !(h.label === 'serving' && own.length))];
}

export const amountText = (e: { item: FoodItem; grams: number; qty?: number; unit?: string }) => {
  if (e.item.source === 'quick') return 'Quick add';
  if (e.qty && e.unit) return `${fmtQty(e.qty)} ${e.unit}`;
  const p = portionsOf(e.item)[0];
  const n = e.grams / p.g;
  return `${fmtQty(Math.round(n * 4) / 4)} ${p.label}`;
};

/* ---------- search ---------- */
const tidy = (s: string) => {
  const t = s.trim().replace(/\s+/g, ' ');
  // USDA names are often ALL CAPS or "Bananas, raw"; make them read naturally.
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
};

async function getJSON(url: string, ms = 12000) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally { clearTimeout(timer); }
}

type DbFood = { id: string; name: string; brand: string; source: 'usda' | 'est' | 'off'; kcal: number; protein: number; carbs: number; fat: number; portions: Portion[] };
const fromDb = (r: DbFood): FoodItem => ({
  id: r.id, name: r.name, brand: r.brand, source: r.source === 'off' ? 'off' : 'usda',
  per100: { kcal: r.kcal, p: r.protein, c: r.carbs, f: r.fat }, portions: r.portions,
});
const searchDb = async (q: string) => (await cloud.rpc<DbFood[]>('search_foods', { q, lim: 25 })).map(fromDb);

/** Saves a logged Open Food Facts product to the shared table if it isn't there yet. Never blocks logging. */
export function rememberFood(item: FoodItem) {
  if (item.source !== 'off') return;
  const { p, c, f, kcal } = item.per100;
  cloud.insertNew('foods', { id: item.id, name: item.name, brand: item.brand, source: 'off', kcal, protein: p, carbs: c, fat: f, portions: item.portions ?? [] }, 'id').catch(() => {});
}

async function searchOFF(q: string): Promise<FoodItem[]> {
  const fields = 'code,product_name,brands,nutriments,serving_quantity,serving_size';
  // The newer search API doesn't allow browser (CORS) requests, so the web preview uses the classic endpoint.
  const url = Platform.OS === 'web'
    ? `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=20&fields=${fields}`
    : `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=20&langs=en&fields=${fields}`;
  const data = await getJSON(url);
  return (data?.hits ?? data?.products ?? []).map((h: any): FoodItem | null => {
    const n = h.nutriments ?? {}, kcal = Number(n['energy-kcal_100g']) || (Number(n['energy_100g']) ? Number(n['energy_100g']) / 4.184 : 0);
    if (!kcal || !h.product_name) return null;
    const sq = Number(h.serving_quantity);
    return {
      id: `off:${h.code}`, name: tidy(String(h.product_name)), brand: Array.isArray(h.brands) ? h.brands[0] ?? '' : String(h.brands ?? ''), source: 'off',
      per100: { kcal: Math.round(kcal), p: r1(Number(n.proteins_100g) || 0), c: r1(Number(n.carbohydrates_100g) || 0), f: r1(Number(n.fat_100g) || 0) },
      portions: sq > 0 ? [{ g: sq, label: /^\s*[\d.,]+\s*(g|ml)\b/i.test(String(h.serving_size ?? '')) || !h.serving_size ? 'serving' : String(h.serving_size) }] : [{ g: 100, label: '100 g' }], // no serving info: don't pretend 100 g is a serving
    };
  }).filter(Boolean) as FoodItem[];
}

/** Foods from the Neon database first, then packaged products from Open Food Facts. */
export async function searchFoods(q: string): Promise<FoodItem[]> {
  const [db, off] = await Promise.allSettled([searchDb(q), searchOFF(q)]);
  if (db.status === 'rejected' && off.status === 'rejected') throw new Error('Couldn’t reach the food database. Check your connection and try again.');
  const mine = db.status === 'fulfilled' ? db.value : [], packaged = off.status === 'fulfilled' ? off.value : [];
  const seen = new Set<string>(), out: FoodItem[] = [];
  for (const f of [...mine, ...packaged]) {
    const k = `${f.name.toLowerCase()}|${f.brand.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push(f);
  }
  return out;
}
