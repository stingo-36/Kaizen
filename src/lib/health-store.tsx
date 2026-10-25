import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { connectHealth, grantedTypes, healthStatus, openHealthSettings, readHealthToday } from './health';
import { emptySummary, HealthStatus, HealthSummary, HealthType } from './health-types';

/* Health Connect state shared by Home and the Health screen. The last reading is cached so numbers show instantly. */
const CACHE = 'kaizen.health.last';

type Ctx = {
  status: HealthStatus | 'checking'; granted: HealthType[]; data: HealthSummary; busy: boolean;
  connect: () => Promise<void>; refresh: () => Promise<void>; openSettings: () => void;
};
const HealthCtx = createContext<Ctx | null>(null);
export const useHealth = () => {
  const c = useContext(HealthCtx);
  if (!c) throw new Error('useHealth must be used inside HealthProvider');
  return c;
};

export function HealthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<HealthStatus | 'checking'>(Platform.OS === 'android' ? 'checking' : 'unsupported');
  const [granted, setGranted] = useState<HealthType[]>([]);
  const [data, setData] = useState<HealthSummary>(emptySummary());
  const [busy, setBusy] = useState(false);
  const request = useRef(0);

  const load = useCallback(async (types: HealthType[], version: number) => {
    if (version !== request.current) return;
    if (!types.length) {
      setData(emptySummary());
      setBusy(false);
      AsyncStorage.removeItem(CACHE).catch(() => {});
      return;
    }
    setBusy(true);
    try {
      const d = await readHealthToday(types);
      if (version !== request.current) return;
      setData(d);
      AsyncStorage.setItem(CACHE, JSON.stringify(d)).catch(() => {});
    } finally { if (version === request.current) setBusy(false); }
  }, []);

  const refresh = useCallback(async () => {
    const version = ++request.current;
    const s = await healthStatus();
    if (version !== request.current) return;
    setStatus(s);
    const g = s === 'ready' ? await grantedTypes().catch(() => [] as HealthType[]) : [];
    if (version !== request.current) return;
    setGranted(g);
    await load(g, version);
  }, [load]);

  const connect = useCallback(async () => {
    const version = ++request.current;
    const g = await connectHealth().catch(() => [] as HealthType[]);
    if (version !== request.current) return;
    setGranted(g);
    await load(g, version);
  }, [load]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Show the cached reading first, then fetch fresh numbers.
    AsyncStorage.getItem(CACHE).then((v) => { if (v) { try { setData(JSON.parse(v)); } catch {} } }).catch(() => {}).finally(refresh);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  return <HealthCtx.Provider value={{ status, granted, data, busy, connect, refresh, openSettings: openHealthSettings }}>{children}</HealthCtx.Provider>;
}
