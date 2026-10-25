import * as SystemUI from 'expo-system-ui';
import { ReactNode, useEffect } from 'react';

import { C } from './theme';

/** Keep the native window background consistent with the light palette. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => { SystemUI.setBackgroundColorAsync(C.bg).catch(() => {}); }, []);
  return <>{children}</>;
}
