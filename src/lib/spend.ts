import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* SpendWise link: Pulse reads a read-only spending summary from the user's SpendWise server.
   The two apps keep separate accounts. Connecting trades the SpendWise email and password for a
   read-only token once; only the token is kept (Keychain/Keystore), never the password. */
const LINK_KEY = 'pulse.spendwise.link';
const CACHE_KEY = 'pulse.spendwise.cache';

export type SpendLink = { url: string; email: string; token: string };

export type SpendSummary = {
  month: string; // YYYY-MM
  totalSpend: number;
  prevMonthSpend: number;
  deltaPct: number | null;
  budget: number | null;
  /** Spend in the budgeted categories only; compare this, not totalSpend, with budget. */
  budgetSpent: number;
  todaySpend: number;
  categories: { name: string; amount: number; budget: number | null }[];
  weeks: { label: string; total: number }[];
  recent: { id: number; merchant: string; amount: number; occurredAt: string; category: string | null; instrument: string; isCreditCard: boolean }[];
  uncategorizedCount: number;
  /** Newer SpendWise servers only: spend charged to credit cards, money in, and what left the bank account. */
  creditCardSpend?: number;
  moneyIn?: number;
  accountOutflow?: number;
};

/** Thrown when SpendWise no longer accepts the saved token, so the user has to connect again. */
export class SpendAuthError extends Error {}

const secure = {
  get: (k: string) => (Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

export async function loadLink(): Promise<SpendLink | null> {
  try { return JSON.parse((await secure.get(LINK_KEY)) || 'null'); } catch { return null; }
}
export async function clearLink() {
  await Promise.all([secure.del(LINK_KEY), AsyncStorage.removeItem(CACHE_KEY)]).catch(() => {});
}

/** "spendwise.vercel.app" → "https://spendwise.vercel.app"; plain http only for local dev servers. */
export function normalizeUrl(raw: string): string | null {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `${/^(localhost|127\.|10\.|192\.168\.)/.test(u) ? 'http' : 'https'}://${u}`;
  try { return new URL(u).origin; } catch { return null; }
}

/* A SpendWise behind Vercel Deployment Protection turns away every request without a Vercel login.
   Its "Protection Bypass for Automation" secret lets this app through while the site stays private. */
const VERCEL_BYPASS = process.env.EXPO_PUBLIC_VERCEL_BYPASS;

/** The SpendWise server Pulse reads from. Fixed: users only sign in, they don't pick a server. */
export const SPENDWISE_URL = normalizeUrl(process.env.EXPO_PUBLIC_SPENDWISE_URL || 'spend-wise-en-rg.vercel.app') as string;

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  // The bypass goes in the query string, not a header: the browser's CORS pre-check (web preview)
  // can't carry custom headers, and Vercel turns that pre-check away without it.
  const u = VERCEL_BYPASS ? `${url}${url.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS)}` : url;
  let res: Response;
  try { res = await fetch(u, init); } catch { throw new Error('Couldn’t reach SpendWise. Check the address and your connection.'); }
  // Vercel's login page (a redirect to HTML) instead of SpendWise's JSON.
  if (res.url.includes('vercel.com') || (res.headers.get('content-type') ?? '').includes('text/html')) {
    throw new Error('SpendWise is behind Vercel’s login. Add its bypass key to the app (EXPO_PUBLIC_VERCEL_BYPASS).');
  }
  const body = await res.json().catch(() => ({}));
  if (typeof body.error === 'object' && /protected deployment/i.test(body.error?.message ?? '')) {
    throw new Error('SpendWise is behind Vercel’s login. Add its bypass key to the app (EXPO_PUBLIC_VERCEL_BYPASS).');
  }
  if (res.status === 401) throw new SpendAuthError(body.error || 'unauthorized');
  if (!res.ok) throw new Error(body.error || `SpendWise returned ${res.status}`);
  return body as T;
}

export async function connectSpendWise(rawUrl: string, email: string, password: string): Promise<SpendLink> {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error('Enter your SpendWise address');
  try {
    const r = await call<{ token: string; email: string }>(`${url}/api/mobile/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
    });
    const link = { url, email: r.email, token: r.token };
    await secure.set(LINK_KEY, JSON.stringify(link));
    return link;
  } catch (e) {
    if (e instanceof SpendAuthError) throw new Error('Wrong SpendWise email or password');
    throw e;
  }
}

export function fetchSummary(link: SpendLink, month: string): Promise<SpendSummary> {
  return call<SpendSummary>(`${link.url}/api/mobile/summary?month=${month}`, { headers: { Authorization: `Bearer ${link.token}` } });
}

export type SpendTxn = { id: number; occurredAt: string; amount: number; direction: 'debit' | 'credit'; label: string; categoryName: string | null; instrument: string; isCreditCard: boolean };
export type TxnPage = { total: number; page: number; pageSize: number; items: SpendTxn[] };

/** One page of the full transaction list, newest first. `month` is YYYY-MM, or null for all time. */
export function fetchTransactions(link: SpendLink, month: string | null, page: number, pageSize = 50): Promise<TxnPage> {
  const q = `page=${page}&pageSize=${pageSize}${month ? `&month=${month}` : ''}`;
  return call<TxnPage>(`${link.url}/api/mobile/transactions?${q}`, { headers: { Authorization: `Bearer ${link.token}` } });
}

/* Last summary per month, so the card shows instantly and offline. */
export async function readCache(): Promise<Record<string, SpendSummary & { at: number }>> {
  try { return JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || '{}'); } catch { return {}; }
}
export async function writeCache(s: SpendSummary) {
  const c = await readCache();
  c[s.month] = { ...s, at: Date.now() };
  // Keep the newest few months only.
  const keep = Object.keys(c).sort().slice(-6);
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(keep.map((k) => [k, c[k]])))).catch(() => {});
}

/* ---------- formatting ---------- */
export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split('-').map(Number); return thisMonth(new Date(y, mo - 1 + n, 1)); };
export const monthName = (m: string, withYear = false) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });
};
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
/** ₹8.2k, ₹1.4L — for tight spots like chips. */
export const inrShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '')}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '')}k`;
  return inr(n);
};
