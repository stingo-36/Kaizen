import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { Roboto_600SemiBold } from '@expo-google-fonts/roboto/600SemiBold';
import { Roboto_700Bold } from '@expo-google-fonts/roboto/700Bold';
import { useFonts } from 'expo-font';
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
import { ThemeProvider } from '@/lib/theme-store';
import { WorkNestProvider } from '@/lib/worknest-store';

SplashScreen.preventAutoHideAsync();

// Web preview only: drop the browser's default focus ring on text boxes (it clashes with the app's own styling).
if (typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent = ':root { color-scheme: light; background: #F5F6FB; } input:focus-visible, textarea:focus-visible { outline: 2px solid #3459E6; outline-offset: 2px; }';
  document.head.appendChild(css);
}

function RootStack() {
  const { ready, me, profile } = useStore();
  const setup = !!me && profile.onboarded === false;
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={setup}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!me && !setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="coach" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="habit/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="day" />
        <Stack.Screen name="review" />
        <Stack.Screen name="recovery" />
        <Stack.Screen name="home-settings" />
        <Stack.Screen name="food/templates" />
        <Stack.Screen name="workout/progression" />
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_600SemiBold, Roboto_700Bold });
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
                    <StatusBar style="dark" />
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
