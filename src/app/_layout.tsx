// One import per weight: the package index would bundle all 18 Inter files (~6 MB on web).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import { router, Stack, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PageTitle, SiteMeta } from '@/components/page-title';
import { StoreProvider, useStore } from '@/data/store';
import { onReminderTapped, setupNotifications, syncReminders } from '@/notifications';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
setupNotifications().catch(() => {});

/** Keeps scheduled reminders in step with products and settings. */
function ReminderSync() {
  const { products, settings } = useStore();
  // Only reschedule when something that affects reminders actually changed.
  const key = JSON.stringify([
    settings.notifications && settings.onboarded,
    products.map((p) => [p.id, p.name, p.purchaseDate, p.warrantyMonths, p.reminderDays]),
  ]);

  useEffect(() => {
    syncReminders(products, settings.notifications && settings.onboarded);
    // `key` captures every field used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/** Opens the product when the user taps a reminder, including when it launched the app. */
function useNotificationTaps() {
  useEffect(() => {
    return onReminderTapped((url) => router.push(url as Href));
  }, []);
}

/** Mounted only after the stack is ready, so tap-to-open can navigate. */
function NotificationTaps() {
  useNotificationTaps();
  return null;
}

function RootStack() {
  const { ready } = useStore();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="analyzing" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="claim/[id]" />
        <Stack.Screen name="guides" />
        <Stack.Screen name="assistant" />
      </Stack>
      <NotificationTaps />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Default title, rendered before the data gate so pre-rendered pages include it;
          each screen's own <PageTitle> takes over once the app has loaded. */}
      <PageTitle />
      <SiteMeta />
      <StoreProvider>
        <RootStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
