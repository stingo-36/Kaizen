import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useStore } from './store';
import {
  addEntry, clearLink, connectWorkNest, fetchEntries, loadLink, NestAuthError, NestEntry, NestLink, NewEntry, patchEntry, readCache, writeCache,
} from './worknest';

/* WorkNest Tracker state shared by Home and the Tracker tab. The cached list shows first, then a fresh one loads. */
type Status = 'loading' | 'off' | 'on' | 'expired';
type Ctx = {
  status: Status; link: NestLink | null; entries: NestEntry[]; at: number | null; busy: boolean; error: string;
  connect: (email: string, password: string) => Promise<void>;
  disconnect: () => Promise<void>;
  load: () => Promise<void>;
  add: (entry: NewEntry) => Promise<void>;
  setDone: (id: string, done: boolean) => Promise<void>;
  edit: (id: string, subject: string) => Promise<void>;
};
const NestCtx = createContext<Ctx | null>(null);
export const useWorkNest = () => {
  const c = useContext(NestCtx);
  if (!c) throw new Error('useWorkNest must be used inside WorkNestProvider');
  return c;
};

export function WorkNestProvider({ children }: { children: ReactNode }) {
  const { me } = useStore();
  const [status, setStatus] = useState<Status>('loading');
  const [link, setLink] = useState<NestLink | null>(null);
  const [entries, setEntries] = useState<NestEntry[]>([]);
  const [at, setAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linkRef = useRef<NestLink | null>(null);

  const fresh = useCallback((list: NestEntry[]) => {
    setEntries(list); setAt(Date.now()); setStatus('on'); setError('');
    writeCache(list);
  }, []);
  /** Runs a call that returns the new list; a dead token flips the screen to "sign in again". */
  const run = useCallback(async (fn: (l: NestLink) => Promise<NestEntry[]>) => {
    const l = linkRef.current;
    if (!l) return;
    try { fresh(await fn(l)); } catch (e) {
      if (e instanceof NestAuthError) { setStatus('expired'); return; }
      throw e;
    }
  }, [fresh]);

  const load = useCallback(async () => {
    setBusy(true);
    try { await run(fetchEntries); } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load your Tracker');
    } finally { setBusy(false); }
  }, [run]);

  const connect = useCallback(async (email: string, password: string) => {
    const l = await connectWorkNest(email, password);
    linkRef.current = l;
    setLink(l);
    setStatus('on');
    await load();
  }, [load]);

  const disconnect = useCallback(async () => {
    linkRef.current = null;
    setLink(null); setEntries([]); setAt(null); setError(''); setStatus('off');
    await clearLink();
  }, []);

  const add = useCallback((entry: NewEntry) => run((l) => addEntry(l, entry)), [run]);

  // Ticks show at once; the server's list replaces them, or the old state comes back if it fails.
  const setDone = useCallback(async (id: string, done: boolean) => {
    const before = entries;
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, status: done ? 'Done' : 'Open', completedAt: done ? new Date().toISOString() : null } : e)));
    try { await run((l) => patchEntry(l, id, { status: done ? 'Done' : 'Open' })); } catch (e) { setEntries(before); throw e; }
  }, [entries, run]);

  const edit = useCallback((id: string, subject: string) => run((l) => patchEntry(l, id, { subject })), [run]);

  useEffect(() => {
    let live = true;
    (async () => {
      const [l, cache] = await Promise.all([loadLink(), readCache()]);
      if (!live) return;
      linkRef.current = l;
      setLink(l);
      if (cache) { setEntries(cache.entries); setAt(cache.at); }
      setStatus(l ? 'on' : 'off');
      if (l) load();
    })();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => { live = false; sub.remove(); };
  }, [load]);

  // The link belongs to whoever is signed in to Pulse on this phone: drop it when they log out.
  const prevMe = useRef(me);
  useEffect(() => {
    if (prevMe.current && !me) disconnect();
    prevMe.current = me;
  }, [me, disconnect]);

  return (
    <NestCtx.Provider value={{ status, link, entries, at, busy, error, connect, disconnect, load, add, setDone, edit }}>{children}</NestCtx.Provider>
  );
}
