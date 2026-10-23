import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* Neon backend: Managed Better Auth for accounts, Data API (PostgREST) for data.
   Every table has row-level security, so a signed-in user can only reach their own rows.
   These URLs are public endpoints, not secrets. */
const AUTH = 'https://ep-green-credit-a1def8xw.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth';
const DATA = 'https://ep-green-credit-a1def8xw.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const COOKIE = '__Secure-neon-auth.session_token';
const SESSION_KEY = 'pulse.cloud.session';

export type CloudUser = { id: string; name: string; email: string; createdAt: string };
type Saved = { cookie: string | null; user: CloudUser };

/* ---------- session storage (Keychain/Keystore on phones, localStorage on web preview) ---------- */
const secure = {
  get: (k: string) => (Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

let saved: Saved | null = null;
let jwt: { token: string; exp: number } | null = null;

export async function restoreSession(): Promise<CloudUser | null> {
  try { saved = JSON.parse((await secure.get(SESSION_KEY)) || 'null'); } catch { saved = null; }
  return saved?.user ?? null;
}
const persist = () => (saved ? secure.set(SESSION_KEY, JSON.stringify(saved)) : secure.del(SESSION_KEY));

/** Phones expose Set-Cookie to JS; keep the signed session cookie so token refresh never depends on the OS cookie jar. */
function grabCookie(res: Response) {
  const raw = res.headers.get('set-cookie');
  const m = raw?.match(new RegExp(`${COOKIE.replace(/[.]/g, '\\.')}=([^;]+)`));
  return m ? m[1] : null;
}
const authHeaders = (): Record<string, string> => (saved?.cookie && Platform.OS !== 'web' ? { Cookie: `${COOKIE}=${saved.cookie}` } : {});
/* Neon Auth rejects sign-up/sign-in without an Origin header (MISSING_OR_NULL_ORIGIN), and once a session
   cookie is sent the origin must also be trusted. Browsers set it themselves; phones never do. Trusted
   origins must be http(s), so native requests use localhost, which this project trusts (allow_localhost). */
const originHeader = (): Record<string, string> => (Platform.OS === 'web' ? {} : { Origin: 'http://localhost' });

const friendly = (code?: string, msg?: string) => ({
  INVALID_EMAIL_OR_PASSWORD: 'That email and password don’t match. Check them and try again.',
  USER_ALREADY_EXISTS: 'An account with that email already exists. Try logging in.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with that email already exists. Try logging in.',
  PASSWORD_TOO_SHORT: 'Password needs at least 8 characters.',
  INVALID_EMAIL: 'Enter a valid email address.',
} as Record<string, string>)[code ?? ''] ?? msg ?? 'Something went wrong. Try again.';

async function authPost(path: string, body: object) {
  let res: Response;
  try {
    res = await fetch(`${AUTH}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...originHeader() }, body: JSON.stringify(body), credentials: 'include' });
  } catch { throw new Error('No internet connection. Check your connection and try again.'); }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(friendly(data.code, data.message));
  const u = data.user;
  saved = { cookie: grabCookie(res), user: { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt } };
  jwt = null;
  await persist();
  return saved.user;
}

export const signUp = (name: string, email: string, password: string) => authPost('/sign-up/email', { name, email, password });
export const signIn = (email: string, password: string) => authPost('/sign-in/email', { email, password });

export async function signOut() {
  try { await fetch(`${AUTH}/sign-out`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...originHeader(), ...authHeaders() }, body: '{}', credentials: 'include' }); } catch {}
  saved = null; jwt = null;
  await persist();
}

/** Short-lived (15 min) JWT for the Data API and the coach function, refreshed a minute before it expires. */
export async function token() {
  if (jwt && jwt.exp - 60 > Date.now() / 1000) return jwt.token;
  const res = await fetch(`${AUTH}/token`, { headers: { ...originHeader(), ...authHeaders() }, credentials: 'include' });
  if (res.status === 401) throw new Error('signed-out');
  if (!res.ok) throw new Error(`Couldn't refresh your session (${res.status})`);
  const t: string = (await res.json()).token;
  const payload = JSON.parse(globalThis.atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  jwt = { token: t, exp: payload.exp };
  return t;
}

/* ---------- Data API ---------- */
async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const res = await fetch(`${DATA}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(init.prefer ? { Prefer: init.prefer } : {}), ...(init.headers as object) },
  });
  if (!res.ok) {
    const e: any = await res.json().catch(() => ({}));
    throw new Error(e.message || `Sync failed (${res.status})`);
  }
  return res.status === 204 || res.headers.get('content-length') === '0' ? null : res.json().catch(() => null);
}
export const select = <T,>(table: string, query = 'select=*') => rest(`/${table}?${query}`) as Promise<T[]>;
export const upsert = (table: string, rows: object | object[], onConflict: string) =>
  rest(`/${table}?on_conflict=${onConflict}`, { method: 'POST', body: JSON.stringify(rows), prefer: 'resolution=merge-duplicates,return=minimal' });
export const remove = (table: string, filter: string) => rest(`/${table}?${filter}`, { method: 'DELETE', prefer: 'return=minimal' });
export const update = (table: string, filter: string, patch: object) =>
  rest(`/${table}?${filter}`, { method: 'PATCH', body: JSON.stringify(patch), prefer: 'return=minimal' });
/** Calls a Postgres function exposed by the Data API (e.g. search_foods). */
export const rpc = <T,>(fn: string, args: object) => rest(`/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }) as Promise<T>;
/** Inserts rows, skipping any whose key already exists (for shared tables users may only add to). */
export const insertNew = (table: string, rows: object | object[], onConflict: string) =>
  rest(`/${table}?on_conflict=${onConflict}`, { method: 'POST', body: JSON.stringify(rows), prefer: 'resolution=ignore-duplicates,return=minimal' });
