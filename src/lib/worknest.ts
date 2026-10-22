import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { normalizeUrl } from './spend';

/* WorkNest link: Pulse shows the user's WorkNest Tracker (to-dos, follow-ups, notes) and can add to it.
   The two apps keep separate accounts. Connecting trades the WorkNest email and password for a
   Tracker-only token once; only the token is kept (Keychain/Keystore), never the password. */
const LINK_KEY = 'pulse.worknest.link';
const CACHE_KEY = 'pulse.worknest.cache';

export type NestLink = { url: string; email: string; token: string };

export type NestKind = 'Task' | 'FollowUp' | 'Note';
export type NestEntry = {
  id: string;
  kind: NestKind;
  /** Who a follow-up is addressed to; null for to-dos and notes. */
  person: string | null;
  subject: string;
  status: 'Open' | 'Done';
  pinned: boolean;
  /** A personal to-do (sticky note); work to-dos are false. */
  personal: boolean;
  tags: string[];
  /** Plain calendar day, YYYY-MM-DD. */
  dueDate: string | null;
  completedAt: string | null;
  updatedAt: string;
  lastUpdate: { note: string; fromThem: boolean; occurredAt: string } | null;
};

/** Thrown when WorkNest no longer accepts the saved token, so the user has to connect again. */
export class NestAuthError extends Error {}

const secure = {
  get: (k: string) => (Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

export async function loadLink(): Promise<NestLink | null> {
  try { return JSON.parse((await secure.get(LINK_KEY)) || 'null'); } catch { return null; }
}
export async function clearLink() {
  await Promise.all([secure.del(LINK_KEY), AsyncStorage.removeItem(CACHE_KEY)]).catch(() => {});
}

/** The WorkNest server Pulse talks to. Fixed: users only sign in, they don't pick a server. */
export const WORKNEST_URL = normalizeUrl(process.env.EXPO_PUBLIC_WORKNEST_URL || 'work-nest-en-rg.vercel.app') as string;

/* Like SpendWise, WorkNest sits behind Vercel Deployment Protection; its own "Protection Bypass for
   Automation" secret lets this app through while the site stays private. Sent in the query string
   for the same reason as SpendWise's: the web preview's CORS pre-check can't carry custom headers. */
const VERCEL_BYPASS = process.env.EXPO_PUBLIC_WORKNEST_BYPASS;
const BEHIND_LOGIN = 'WorkNest is behind Vercel’s login. Add its bypass key to the app (EXPO_PUBLIC_WORKNEST_BYPASS).';

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const u = VERCEL_BYPASS ? `${url}${url.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS)}` : url;
  let res: Response;
  try { res = await fetch(u, init); } catch { throw new Error('Couldn’t reach WorkNest. Check your connection.'); }
  if (res.url.includes('vercel.com')) throw new Error(BEHIND_LOGIN);
  // An older WorkNest without the phone API answers with an HTML page, not JSON.
  if ((res.headers.get('content-type') ?? '').includes('text/html')) throw new Error('This WorkNest doesn’t support the Pulse link yet. Deploy the latest WorkNest.');
  const body = await res.json().catch(() => ({}));
  if (typeof body.error === 'object' && /protected deployment/i.test(body.error?.message ?? '')) throw new Error(BEHIND_LOGIN);
  if (res.status === 401) throw new NestAuthError(body.error || 'unauthorized');
  if (!res.ok) throw new Error(body.error || `WorkNest returned ${res.status}`);
  return body as T;
}
const authed = (link: NestLink, init: RequestInit = {}): RequestInit => ({
  ...init, headers: { Authorization: `Bearer ${link.token}`, 'Content-Type': 'application/json', ...(init.headers as object) },
});

export async function connectWorkNest(email: string, password: string): Promise<NestLink> {
  try {
    const r = await call<{ token: string; email: string }>(`${WORKNEST_URL}/api/mobile/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
    });
    const link = { url: WORKNEST_URL, email: r.email, token: r.token };
    await secure.set(LINK_KEY, JSON.stringify(link));
    return link;
  } catch (e) {
    if (e instanceof NestAuthError) throw new Error('Wrong WorkNest email or password');
    throw e;
  }
}

export const fetchEntries = (link: NestLink) =>
  call<{ entries: NestEntry[] }>(`${link.url}/api/mobile/tracker`, authed(link)).then((r) => r.entries);

export type NewEntry = { kind: NestKind; subject: string; personal?: boolean; person?: string; note?: string; dueDate?: string | null };
/** Adds an entry; WorkNest answers with the whole fresh list. */
export const addEntry = (link: NestLink, entry: NewEntry) =>
  call<{ entries: NestEntry[] }>(`${link.url}/api/mobile/tracker`, authed(link, { method: 'POST', body: JSON.stringify(entry) })).then((r) => r.entries);

/** Tick/untick, or rewrite a sticky note's text. */
export const patchEntry = (link: NestLink, id: string, patch: { status: 'Open' | 'Done' } | { subject: string }) =>
  call<{ entries: NestEntry[] }>(`${link.url}/api/mobile/tracker/${encodeURIComponent(id)}`, authed(link, { method: 'PATCH', body: JSON.stringify(patch) })).then((r) => r.entries);

/* Last list, so the Tracker shows instantly and offline. */
export async function readCache(): Promise<{ entries: NestEntry[]; at: number } | null> {
  try { return JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || 'null'); } catch { return null; }
}
export const writeCache = (entries: NestEntry[]) =>
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ entries, at: Date.now() })).catch(() => {});

/* ---------- dates (plain calendar days, the phone's own clock) ---------- */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (key: string, n: number) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
/** "Fri 23 Oct". */
export const dayLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
