import { Cinzel_700Bold, Cinzel_800ExtraBold } from '@expo-google-fonts/cinzel';
import { LibreBaskerville_700Bold } from '@expo-google-fonts/libre-baskerville';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { InvitePopup } from '../components/InvitePopup';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../net/session';
import { SettingsProvider } from '../state/settings';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cinzel_700Bold,
    Cinzel_800ExtraBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    LibreBaskerville_700Bold,
  });

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    SystemUI.setBackgroundColorAsync(colors.bgDeep).catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SessionProvider>
          <StatusBar hidden style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 280,
              contentStyle: { backgroundColor: colors.bgDeep },
              orientation: 'landscape',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="lobby" options={{ animation: 'fade' }} />
            <Stack.Screen name="game" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="result" options={{ animation: 'fade' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile" options={{ animation: 'fade' }} />
          </Stack>
          {/* admin invitations pop up over any screen */}
          <InvitePopup />
          </SessionProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
