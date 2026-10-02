import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText, Button } from '@/components';
import { AppServicesProvider, createAppServices, type AppServices } from '@/services/AppServices';
import { borderWidth, colors, durations, fontAssets, spacing } from '@/theme';
import { AppLockGate } from '@/views/privacy/AppLockGate';

/** Phone-width column for the web build on desktop browsers. */
const WEB_MAX_APP_WIDTH = 480;

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (fast refresh): safe to ignore.
});

type BootState =
  | { status: 'loading' }
  | { status: 'ready'; services: AppServices }
  | { status: 'error'; message: string };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [bootState, setBootState] = useState<BootState>({ status: 'loading' });

  const boot = useCallback(() => {
    createAppServices()
      .then((services) => setBootState({ status: 'ready', services }))
      .catch((error: unknown) => {
        console.error('[boot] failed to open diary storage', error);
        setBootState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Lỗi lưu trữ không xác định.',
        });
      });
  }, []);

  useEffect(boot, [boot]);

  const retry = useCallback(() => {
    setBootState({ status: 'loading' });
    boot();
  }, [boot]);

  // Fonts failing to load is non-fatal: the system font is used instead.
  const fontsSettled = fontsLoaded || fontError !== null;
  const isReady = fontsSettled && bootState.status !== 'loading';

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [isReady]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={[styles.root, Platform.OS === 'web' && styles.webDesk]}>
      <SafeAreaProvider style={Platform.OS === 'web' ? styles.webPhone : undefined}>
        <StatusBar style="dark" />
        {bootState.status === 'ready' ? (
          <AppServicesProvider services={bootState.services}>
            <AppLockGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animationDuration: durations.normal,
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="photo/[id]" options={{ animation: 'slide_from_bottom' }} />
              </Stack>
            </AppLockGate>
          </AppServicesProvider>
        ) : bootState.status === 'error' ? (
          <View style={styles.error}>
            <AppText variant="heading" align="center">
              Không mở được nhật ký.
            </AppText>
            <AppText variant="body" color="textMuted" align="center">
              Ảnh của bạn vẫn còn nguyên trên máy. Thử lại sau giây lát nhé.
            </AppText>
            <AppText variant="caption" color="textFaint" align="center">
              {bootState.message}
            </AppText>
            <Button label="Thử lại" icon="refresh" onPress={retry} />
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Web: the app is mobile-first, so on wide screens it sits in a phone-width column.
  webDesk: {
    backgroundColor: colors.chip,
    alignItems: 'center',
  },
  webPhone: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_APP_WIDTH,
    backgroundColor: colors.background,
    borderLeftWidth: borderWidth.hairline,
    borderRightWidth: borderWidth.hairline,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
