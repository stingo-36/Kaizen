import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { applyScheme, C, Scheme, ThemeMode } from './theme';

/* Light / Dark / System, chosen in Profile and kept on the phone. */
const KEY = 'kaizen.theme';
type Ctx = { mode: ThemeMode; scheme: Scheme; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx>({ mode: 'system', scheme: 'light', setMode: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode | null>(null);
  const scheme: Scheme = (mode ?? 'system') === 'system' ? (sys === 'dark' ? 'dark' : 'light') : (mode as Scheme);
  // Swap the palette before anything below renders with it.
  if (mode) applyScheme(scheme);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setModeState(v === 'light' || v === 'dark' ? v : 'system')).catch(() => setModeState('system'));
  }, []);
  useEffect(() => { if (mode) SystemUI.setBackgroundColorAsync(C.bg).catch(() => {}); }, [mode, scheme]);

  const setMode = useCallback((m: ThemeMode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); }, []);
  if (!mode) return null;
  return <ThemeCtx.Provider value={{ mode, scheme, setMode }}>{children}</ThemeCtx.Provider>;
}
