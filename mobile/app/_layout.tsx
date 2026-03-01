import { useState, useEffect, useRef } from 'react';
import { Stack, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
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
import { Colors } from '@/constants/colors';
import type { User, AuthTokens } from '@/types/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    setup();
    return () => {
      mounted = false;
      notifListener.current?.remove();
    };
  }, [user?.id]);

  const login = async (username: string, password: string) => {
    const tokens = await apiFetch<AuthTokens>('/api/v1/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await tokenStore.setTokens(tokens.access, tokens.refresh);
    const me = await apiFetch<User>('/api/v1/auth/me/');
    setUser(me);
  };

  const register = async (data: RegisterData) => {
    await apiFetch('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await login(data.username, data.password);
  };

  const logout = async () => {
    if (pushTokenRef.current) {
      await removePushToken(pushTokenRef.current);
      pushTokenRef.current = null;
    }
    await tokenStore.clearTokens();
    queryClient.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    const token = await tokenStore.getAccess();
    if (!token) return;
    const me = await apiFetch<User>('/api/v1/auth/me/');
    setUser(me);
  };

  // Derive tab bar visibility from URL segments — eliminates context chain latency.
  // Tab indexes have 1 segment e.g. ['(feed)'], detail screens have >1 e.g. ['(feed)', 'album', 'abc']
  const segments = useSegments();
  const isTabBarHidden = segments.length > 1;

  const authState: AuthState = { user, isLoading, login, register, logout, refreshUser };

  if (isLoading) return null;

  return (
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
  );
}
