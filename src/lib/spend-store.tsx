import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  clearLink, connectSpendWise, fetchSummary, loadLink, readCache, SpendAuthError, SpendLink, SpendSummary, thisMonth, writeCache,
} from './spend';
import { useStore } from './store';

/* SpendWise state shared by Home and the Spending screen. Cached summaries show first, then fresh ones load. */
type Status = 'loading' | 'off' | 'on' | 'expired';
type Ctx = {
  status: Status; link: SpendLink | null;
  summaries: Record<string, SpendSummary & { at?: number }>; busy: boolean; error: string;
  connect: (url: string, email: string, password: string) => Promise<void>;
  disconnect: () => Promise<void>;
  load: (month?: string) => Promise<void>;
};
const SpendCtx = createContext<Ctx | null>(null);
export const useSpend = () => {
  const c = useContext(SpendCtx);
  if (!c) throw new Error('useSpend must be used inside SpendProvider');
  return c;
};

export function SpendProvider({ children }: { children: ReactNode }) {
  const { me } = useStore();
  const [status, setStatus] = useState<Status>('loading');
  const [link, setLink] = useState<SpendLink | null>(null);
  const [summaries, setSummaries] = useState<Ctx['summaries']>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linkRef = useRef<SpendLink | null>(null);

  const load = useCallback(async (month = thisMonth()) => {
    const l = linkRef.current;
    if (!l) return;
    setBusy(true);
    try {
      const s = await fetchSummary(l, month);
      setSummaries((p) => ({ ...p, [month]: { ...s, at: Date.now() } }));
      setStatus('on');
      setError('');
      writeCache(s);
    } catch (e) {
      if (e instanceof SpendAuthError) setStatus('expired');
      else setError(e instanceof Error ? e.message : 'Couldn’t load your spending');
    } finally { setBusy(false); }
  }, []);

  const connect = useCallback(async (url: string, email: string, password: string) => {
    const l = await connectSpendWise(url, email, password);
    linkRef.current = l;
    setLink(l);
    setStatus('on');
    await load();
  }, [load]);

  const disconnect = useCallback(async () => {
    linkRef.current = null;
    setLink(null);
    setSummaries({});
    setError('');
    setStatus('off');
    await clearLink();
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const [l, cache] = await Promise.all([loadLink(), readCache()]);
      if (!live) return;
      linkRef.current = l;
      setLink(l);
      setSummaries(cache);
      setStatus(l ? 'on' : 'off');
      if (l) load();
    })();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => { live = false; sub.remove(); };
  }, [load]);

  // The link belongs to whoever is signed in to Kaizen on this phone: drop it when they log out.
  const prevMe = useRef(me);
  useEffect(() => {
    if (prevMe.current && !me) disconnect();
    prevMe.current = me;
  }, [me, disconnect]);

  return <SpendCtx.Provider value={{ status, link, summaries, busy, error, connect, disconnect, load }}>{children}</SpendCtx.Provider>;
}
