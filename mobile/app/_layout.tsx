import '@/i18n';
import React, { useEffect } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { trackScreen } from '@/lib/track';
import { displayIncoming, endNative, registerCallPushTask, setupNativeCalls } from '@/lib/nativeCall';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from '@/i18n';
import { api, tokens } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerPush } from '@/lib/push';
import { closePayments } from '@/lib/payments';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { Toasts } from '@/components/Toasts';
import { useFonts } from 'expo-font';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Geologica_600SemiBold, Geologica_700Bold, Geologica_800ExtraBold, Geologica_900Black } from '@expo-google-fonts/geologica';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { IncomingCall } from '@/components/IncomingCall';
import type { Call, Message, PublicUser } from '@/lib/types';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function useBootstrap(fontsReady: boolean) {
  useEffect(() => {
    if (!fontsReady) return;
    const { setReady, setAuthed, refreshMe, logout } = useStore.getState();
    tokens.onLogout(() => void useStore.getState().logout());
    (async () => {
      const has = await tokens.load();
      if (has) {
        const me = await refreshMe();
        if (me) {
          setAuthed(true);
          if (['az', 'ru', 'en'].includes(me.locale) && me.locale !== i18n.language) void i18n.changeLanguage(me.locale);
        } else {
          await logout();
        }
      }
      setReady(true);
      void SplashScreen.hideAsync().catch(() => {});
    })();
  }, [fontsReady]);
}

/** Giriş edilmiş istifadəçi üçün real-time hadisələr */
function useRealtime(authed: boolean) {
  useEffect(() => {
    if (!authed) return;
    const s = connectSocket();
    const st = useStore.getState;
    const refreshUnread = async () => {
      try {
        const r = await api<{ items: { unread: number }[] }>('/conversations');
        st().setUnreadChats(r.items.reduce((a, c) => a + c.unread, 0));
      } catch {
        /* ignore */
      }
    };
    void refreshUnread();
    void registerPush();
    void setupNativeCalls({ title: i18n.t('calls2.permTitle'), desc: i18n.t('calls2.permDesc'), cancel: i18n.t('common.cancel'), ok: 'OK', channel: i18n.t('calls2.channel') }).then(registerCallPushTask);
    void st().loadGifts();
    s.on('wallet:update', (p: { coins?: number }) => {
      if (typeof p.coins === 'number') st().patchMe({ coins: p.coins });
    });
    // Sistem zəng ekranı (CallKit / ConnectionService) göstərilə bilirsə — tətbiqdaxili modal açılmır
    s.on('call:incoming', (p: { call: Call; caller: PublicUser }) => { if (!displayIncoming(p.call, p.caller)) st().setIncomingCall(p); });
    s.on('call:ended', (p: { callId: string }) => {
      endNative(p.callId);
      if (st().incomingCall?.call.id === p.callId) st().setIncomingCall(null);
    });
    s.on('message:new', (m: Message) => {
      if (m.senderId !== st().me?.id) void refreshUnread();
    });
    s.on('chat:read', () => void refreshUnread());
    s.on('notification', () => st().setUnreadNotifications(st().unreadNotifications + 1));
    s.on('match', (p: { user: PublicUser }) => st().toast(`💞 ${p.user.name}`, 'success'));
    s.on('gift:received', () => void st().refreshMe());
    s.on('force-logout', () => void st().logout());
    return () => {
      s.removeAllListeners();
      disconnectSocket();
      closePayments();
    };
  }, [authed]);
}

function useAuthGate() {
  const ready = useStore((s) => s.ready);
  const authed = useStore((s) => s.authed);
  const onboarded = useStore((s) => s.me?.onboarded);
  const segments = useSegments() as string[];
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!authed) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (onboarded === false) {
      if (segments[1] !== 'onboarding') router.replace('/(auth)/onboarding');
    } else if (onboarded && (inAuth || segments.length === 0)) {
      router.replace('/(tabs)');
    }
  }, [ready, authed, onboarded, segments]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geologica_600SemiBold, Geologica_700Bold, Geologica_800ExtraBold, Geologica_900Black,
    Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold,
  });
  // Şrift yüklənməsə belə tətbiq sistem şrifti ilə açılır
  const fontsReady = fontsLoaded || !!fontError;
  useBootstrap(fontsReady);
  const authed = useStore((s) => s.authed);
  useRealtime(authed);
  useAuthGate();
  // Alqoritm üçün: hansı ekranlara baxılır
  const pathname = usePathname();
  useEffect(() => { if (authed && pathname) trackScreen(pathname); }, [authed, pathname]);
  if (!fontsReady) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="call/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="live/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="match" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="vip" options={{ presentation: 'modal' }} />
          <Stack.Screen name="story/[userId]" options={{ animation: 'fade', gestureEnabled: true }} />
        </Stack>
        <IncomingCall />
        <Toasts />
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
