import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { FoodProvider } from '@/lib/food-store';
import { HealthProvider } from '@/lib/health-store';
import { initNotifications } from '@/lib/notifications';
import { SpendProvider } from '@/lib/spend-store';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { ThemeProvider, useTheme } from '@/lib/theme-store';
import { WorkNestProvider } from '@/lib/worknest-store';

SplashScreen.preventAutoHideAsync();

// Web preview only: drop the browser's default focus ring on text boxes (it clashes with the app's own styling).
if (typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent = 'input:focus, textarea:focus { outline: none !important; }';
  document.head.appendChild(css);
}

function RootStack() {
  const { ready, me, profile } = useStore();
  const { scheme } = useTheme();
  const setup = !!me && profile.onboarded === false;
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    // Keyed by scheme: switching light/dark remounts the screens so they pick up the new colours.
    <Stack key={scheme} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={setup}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!me && !setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="coach" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="habit/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="workout/new" />
        <Stack.Screen name="workout/plan" />
        <Stack.Screen name="workout/session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout/done" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout/exercise" />
        <Stack.Screen name="workout/library" />
        <Stack.Screen name="food/add" />
        <Stack.Screen name="spend/transactions" />
        <Stack.Screen name="health" />
        <Stack.Screen name="share" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!me}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  useEffect(() => { initNotifications().catch(() => {}); }, []);
  if (!fontsLoaded && !fontError) return null;
  return (
    <ThemeProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <FoodProvider>
            <HealthProvider>
              <SpendProvider>
                <WorkNestProvider>
                  <ToastProvider>
                    <ThemedStatusBar />
                    <RootStack />
                  </ToastProvider>
                </WorkNestProvider>
              </SpendProvider>
            </HealthProvider>
          </FoodProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ThemeProvider>
  );
}
