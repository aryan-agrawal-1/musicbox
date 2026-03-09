import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stack, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import * as Notifications from 'expo-notifications';

import { queryClient } from '@/lib/query-client';
import { tokenStore } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import {
  registerForPushNotifications,
  syncPushToken,
  removePushToken,
  handleNotificationTap,
  handleLastNotificationResponse,
} from '@/lib/notifications';
import { AuthContext, type AuthState, type RegisterData } from '@/contexts/auth-context';
import { pendingAppleAuth } from '@/lib/pending-apple-auth';
import { Colors } from '@/constants/colors';
import { AnimatedSplash } from '@/components/animated-splash';
import type { User, AuthTokens } from '@/types/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await tokenStore.getAccess();
        if (!token) return;
        const me = await apiFetch<User>('/api/v1/auth/me/');
        setUser(me);
      } catch {
        await tokenStore.clearTokens();
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    }
    restoreSession();
  }, []);

  // ── Push notification lifecycle ───────────────────────────────────────────
  const pushTokenRef = useRef<string | null>(null);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function setup() {
      const token = await registerForPushNotifications();
      if (!mounted || !token) return;
      pushTokenRef.current = token;
      await syncPushToken(token);
      notifListener.current = Notifications.addNotificationResponseReceivedListener(
        (r) => handleNotificationTap(r.notification)
      );
      await handleLastNotificationResponse();
    }

    setup().catch(() => {
      // Push notification registration may fail in development if the provisioning
      // profile does not include the aps-environment entitlement. Swallow silently —
      // the rest of the app works fine without push tokens.
    });
    return () => {
      mounted = false;
      notifListener.current?.remove();
    };
  }, [user?.id]);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await apiFetch<AuthTokens>('/api/v1/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await tokenStore.setTokens(tokens.access, tokens.refresh);
    const me = await apiFetch<User>('/api/v1/auth/me/');
    setUser(me);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    await apiFetch('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await login(data.username, data.password);
  }, [login]);

  const appleSignIn = useCallback(async (
    identityToken: string,
    email: string,
    fullName: { givenName: string; familyName: string }
  ): Promise<{ isExistingUser: boolean }> => {
    const result = await apiFetch<{
      access?: string;
      refresh?: string;
      is_new_user?: boolean;
      apple_uid?: string;
      email?: string;
      full_name?: { givenName: string; familyName: string };
    }>('/api/v1/auth/apple/', {
      method: 'POST',
      body: JSON.stringify({ identity_token: identityToken, email, full_name: fullName }),
    });

    if (result.access && result.refresh) {
      // Existing user — store tokens and restore session
      await tokenStore.setTokens(result.access, result.refresh);
      const me = await apiFetch<User>('/api/v1/auth/me/');
      setUser(me);
      return { isExistingUser: true };
    }

    // New user — stash pending state so register.tsx can complete onboarding
    if (result.is_new_user && result.apple_uid) {
      pendingAppleAuth.set({
        identityToken,
        appleUid: result.apple_uid,
        email: result.email ?? email,
        fullName,
      });
    }
    return { isExistingUser: false };
  }, []);

  const logout = useCallback(async () => {
    if (pushTokenRef.current) {
      await removePushToken(pushTokenRef.current);
      pushTokenRef.current = null;
    }
    await tokenStore.clearTokens();
    queryClient.clear();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    // Remove push token first while the user still exists, then delete account.
    if (pushTokenRef.current) {
      await removePushToken(pushTokenRef.current);
      pushTokenRef.current = null;
    }
    await apiFetch<void>('/api/v1/auth/me/', { method: 'DELETE' });
    await tokenStore.clearTokens();
    queryClient.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await tokenStore.getAccess();
    if (!token) return;
    const me = await apiFetch<User>('/api/v1/auth/me/');
    setUser(me);
  }, []);

  // Derive tab bar visibility from URL segments — eliminates context chain latency.
  // Tab indexes have 1 segment e.g. ['(feed)'], detail screens have >1 e.g. ['(feed)', 'album', 'abc']
  const segments = useSegments();
  const isTabBarHidden = segments.length > 1;

  const authState: AuthState = useMemo(
    () => ({ user, isLoading, login, register, appleSignIn, logout, deleteAccount, refreshUser }),
    [user, isLoading, login, register, appleSignIn, logout, deleteAccount, refreshUser]
  );

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={DarkTheme}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthContext value={authState}>
          {user ? (
            <NativeTabs minimizeBehavior="onScrollDown" tintColor={Colors.accent} hidden={isTabBarHidden}>
              <NativeTabs.Trigger name="(feed)">
                <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>

              <NativeTabs.Trigger name="(diary)">
                <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
                <NativeTabs.Trigger.Label>Diary</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>

              <NativeTabs.Trigger name="(profile)">
                <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
                <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>

              <NativeTabs.Trigger name="(search)" role="search">
                <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
                <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
            </NativeTabs>
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
            </Stack>
          )}
        </AuthContext>
      </QueryClientProvider>
    </ThemeProvider>
      {!isLoading && !animationDone && (
        <AnimatedSplash onComplete={() => setAnimationDone(true)} />
      )}
    </GestureHandlerRootView>
  );
}
