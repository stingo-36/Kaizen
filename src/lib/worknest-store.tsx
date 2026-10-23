import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useStore } from './store';
import {
  addEntry, addResource, addUpdate, clearLink, connectWorkNest, EntryPatch, fetchEntries, fetchEntry, fetchResources, loadLink, NestAuthError, NestEntry,
  NestEntryDetail, NestLink, NestOptions, NestResource, NewEntry, NewResource, NewUpdate, NO_OPTIONS, patchEntry, readCache, readResourceCache, ResourceList,
  starResource, writeCache, writeResourceCache,
} from './worknest';

/* WorkNest Tracker and Resources state shared by Home, the Tracker tab and the share screen.
   Cached lists show first, then fresh ones load. */
type Status = 'loading' | 'off' | 'on' | 'expired';
type Ctx = {
  status: Status; link: NestLink | null; entries: NestEntry[]; at: number | null; busy: boolean; error: string;
  connect: (email: string, password: string) => Promise<void>;
  disconnect: () => Promise<void>;
  load: () => Promise<void>;
  add: (entry: NewEntry) => Promise<void>;
  setDone: (id: string, done: boolean) => Promise<void>;
  edit: (id: string, subject: string) => Promise<void>;
  /** Star/unstar or move the due date (null clears it). */
  change: (id: string, patch: EntryPatch) => Promise<void>;
  /** One entry with its whole history, fresh from WorkNest. */
  getEntry: (id: string) => Promise<NestEntryDetail>;
  /** Adds to an entry's history; returns the updated entry and refreshes the lists. */
  addToEntry: (id: string, update: NewUpdate) => Promise<NestEntryDetail>;
  /** Channels, people and note tags for the add forms. */
  options: NestOptions;
  resources: NestResource[];
  /** The user's resource types from WorkNest (Profile → Dropdown lists). */
  resourceTypes: string[];
  /** Set when Resources couldn't load, e.g. a WorkNest that doesn't have the phone Resources API yet. */
  resourcesError: string;
  loadResources: () => Promise<void>;
  saveResource: (r: NewResource) => Promise<void>;
  starRes: (id: string, favorite: boolean) => Promise<void>;
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
  const [options, setOptions] = useState<NestOptions>(NO_OPTIONS);
  const optionsRef = useRef<NestOptions>(NO_OPTIONS);
  const [at, setAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linkRef = useRef<NestLink | null>(null);
  const [lib, setLib] = useState<ResourceList>({ resources: [], types: [] });
  const [resourcesError, setResourcesError] = useState('');

  const fresh = useCallback((list: NestEntry[], opts?: NestOptions | null) => {
    if (opts) { optionsRef.current = opts; setOptions(opts); }
    setEntries(list); setAt(Date.now()); setStatus('on'); setError('');
    writeCache(list, optionsRef.current);
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
    const l = linkRef.current;
    if (!l) return;
    setBusy(true);
    try { const r = await fetchEntries(l); fresh(r.entries, r.options); } catch (e) {
      if (e instanceof NestAuthError) setStatus('expired');
      else setError(e instanceof Error ? e.message : 'Couldn’t load your Tracker');
    } finally { setBusy(false); }
  }, [fresh]);

  const freshLib = useCallback((list: ResourceList) => { setLib(list); setResourcesError(''); writeResourceCache(list); }, []);
  const loadResources = useCallback(async () => {
    const l = linkRef.current;
    if (!l) return;
    try { freshLib(await fetchResources(l)); } catch (e) {
      if (e instanceof NestAuthError) { setStatus('expired'); return; }
      setResourcesError(e instanceof Error ? e.message : 'Couldn’t load your resources');
    }
  }, [freshLib]);
  const starRes = useCallback(async (id: string, favorite: boolean) => {
    const l = linkRef.current;
    if (!l) return;
    // The star flips at once; the server's library replaces it, or it flips back if that fails.
    setLib((x) => ({ ...x, resources: x.resources.map((r) => (r.id === id ? { ...r, favorite } : r)) }));
    try { freshLib(await starResource(l, id, favorite)); } catch (e) {
      setLib((x) => ({ ...x, resources: x.resources.map((r) => (r.id === id ? { ...r, favorite: !favorite } : r)) }));
      if (e instanceof NestAuthError) { setStatus('expired'); return; }
      throw e;
    }
  }, [freshLib]);
  const connect = useCallback(async (email: string, password: string) => {
    const l = await connectWorkNest(email, password);
    linkRef.current = l;
    setLink(l);
    setStatus('on');
    await Promise.all([load(), loadResources()]);
  }, [load, loadResources]);

  const disconnect = useCallback(async () => {
    linkRef.current = null;
    setLink(null); setEntries([]); setAt(null); setError(''); setStatus('off');
    optionsRef.current = NO_OPTIONS; setOptions(NO_OPTIONS);
    setLib({ resources: [], types: [] }); setResourcesError('');
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
  const change = useCallback((id: string, patch: EntryPatch) => run((l) => patchEntry(l, id, patch)), [run]);

  /** Calls that return one entry rather than the list; a dead token flips the screen to "sign in again". */
  const one = useCallback(async (fn: (l: NestLink) => Promise<NestEntryDetail>) => {
    const l = linkRef.current;
    if (!l) throw new Error('Connect WorkNest first');
    try { return await fn(l); } catch (e) {
      if (e instanceof NestAuthError) { setStatus('expired'); throw new Error('Sign in to WorkNest again'); }
      throw e;
    }
  }, []);
  const getEntry = useCallback((id: string) => one((l) => fetchEntry(l, id)), [one]);
  const addToEntry = useCallback(async (id: string, update: NewUpdate) => {
    const entry = await one((l) => addUpdate(l, id, update));
    load();
    return entry;
  }, [one, load]);

  const saveResource = useCallback(async (r: NewResource) => {
    const l = linkRef.current;
    if (!l) throw new Error('Connect WorkNest first');
    try { freshLib(await addResource(l, r)); } catch (e) {
      if (e instanceof NestAuthError) { setStatus('expired'); throw new Error('Sign in to WorkNest again to save resources'); }
      throw e;
    }
  }, [freshLib]);

  useEffect(() => {
    let live = true;
    (async () => {
      const [l, cache, libCache] = await Promise.all([loadLink(), readCache(), readResourceCache()]);
      if (!live) return;
      linkRef.current = l;
      setLink(l);
      if (cache) {
        setEntries(cache.entries); setAt(cache.at);
        if (cache.options) { optionsRef.current = cache.options; setOptions(cache.options); }
      }
      if (libCache) setLib(libCache);
      setStatus(l ? 'on' : 'off');
      if (l) { load(); loadResources(); }
    })();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') { load(); loadResources(); } });
    return () => { live = false; sub.remove(); };
  }, [load, loadResources]);

  // The link belongs to whoever is signed in to Kaizen on this phone: drop it when they log out.
  const prevMe = useRef(me);
  useEffect(() => {
    if (prevMe.current && !me) disconnect();
    prevMe.current = me;
  }, [me, disconnect]);

  return (
    <NestCtx.Provider value={{
      status, link, entries, at, busy, error, connect, disconnect, load, add, setDone, edit, change, getEntry, addToEntry, options,
      resources: lib.resources, resourceTypes: lib.types, resourcesError, loadResources, saveResource, starRes,
    }}>{children}</NestCtx.Provider>
  );
}
