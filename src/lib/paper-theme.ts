import { configureFonts, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { C, F, R } from './theme';

/* React Native Paper (Material 3) themed from Kaizen's own tokens, so Paper components and
   hand-built views share one palette, one font and flat (shadow-free) surfaces. */
const flat = { level0: 'transparent', level1: C.card, level2: C.card, level3: C.card, level4: C.card, level5: C.card };

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: R.btn / 4,
  fonts: configureFonts({
    config: {
      displayLarge: { fontFamily: F.s, fontWeight: 'normal' }, displayMedium: { fontFamily: F.s, fontWeight: 'normal' }, displaySmall: { fontFamily: F.s, fontWeight: 'normal' },
      headlineLarge: { fontFamily: F.s, fontWeight: 'normal' }, headlineMedium: { fontFamily: F.s, fontWeight: 'normal' }, headlineSmall: { fontFamily: F.s, fontWeight: 'normal' },
      titleLarge: { fontFamily: F.s, fontWeight: 'normal' }, titleMedium: { fontFamily: F.s, fontWeight: 'normal' }, titleSmall: { fontFamily: F.s, fontWeight: 'normal' },
      labelLarge: { fontFamily: F.s }, labelMedium: { fontFamily: F.s }, labelSmall: { fontFamily: F.m },
      bodyLarge: { fontFamily: F.r }, bodyMedium: { fontFamily: F.r }, bodySmall: { fontFamily: F.r },
    },
  }),
  colors: {
    ...MD3LightTheme.colors,
    primary: C.accent, onPrimary: C.white,
    primaryContainer: C.accentSoft, onPrimaryContainer: C.accentInk,
    secondary: C.muted, onSecondary: C.white,
    secondaryContainer: C.accentSoft, onSecondaryContainer: C.accentInk,
    tertiary: C.green, onTertiary: C.white,
    background: C.bg, onBackground: C.ink,
    surface: C.card, onSurface: C.ink,
    surfaceVariant: C.soft, onSurfaceVariant: C.muted,
    outline: C.field, outlineVariant: C.line,
    error: C.danger, onError: C.white, errorContainer: C.dangerSoft, onErrorContainer: C.danger,
    inverseSurface: C.ink, inverseOnSurface: C.white, inversePrimary: C.accentSoft,
    elevation: flat,
    surfaceDisabled: 'rgba(16,16,16,0.08)', onSurfaceDisabled: 'rgba(16,16,16,0.38)',
    backdrop: 'rgba(16,16,16,0.4)',
  },
};
