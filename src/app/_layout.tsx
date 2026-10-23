import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PaperIcon } from '@/components/paper-icons';
import { ToastProvider } from '@/components/ui';
import { FoodProvider } from '@/lib/food-store';
import { HealthProvider } from '@/lib/health-store';
import { initNotifications } from '@/lib/notifications';
import { paperTheme } from '@/lib/paper-theme';
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
        <Stack.Screen name="tracker/todo" />
        <Stack.Screen name="tracker/followups" />
        <Stack.Screen name="tracker/notes" />
        <Stack.Screen name="tracker/saved/index" />
        <Stack.Screen name="tracker/saved/[id]" />
        <Stack.Screen name="tracker/entry/[id]" />
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
  const [fontsLoaded, fontError] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  useEffect(() => { initNotifications().catch(() => {}); }, []);
  if (!fontsLoaded && !fontError) return null;
  return (
    <ThemeProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme} settings={{ icon: PaperIcon }}>
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
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ThemeProvider>
  );
}
