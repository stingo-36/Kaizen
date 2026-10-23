import * as SystemUI from 'expo-system-ui';
import { createContext, ReactNode, useContext, useEffect } from 'react';

import { applyScheme, C, Scheme, ThemeMode } from './theme';

/* Kaizen is light-only: the palette is always the light one, whatever the phone is set to. */
type Ctx = { mode: ThemeMode; scheme: Scheme; setMode: (m: ThemeMode) => void };
const LIGHT_ONLY: Ctx = { mode: 'light', scheme: 'light', setMode: () => {} };
const ThemeCtx = createContext<Ctx>(LIGHT_ONLY);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  applyScheme('light');
  useEffect(() => { SystemUI.setBackgroundColorAsync(C.bg).catch(() => {}); }, []);
  return <ThemeCtx.Provider value={LIGHT_ONLY}>{children}</ThemeCtx.Provider>;
}
