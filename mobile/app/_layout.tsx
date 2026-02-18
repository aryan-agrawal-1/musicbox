import { use, useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/lib/query-client';
import { tokenStore } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
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
    await tokenStore.clearTokens();
    queryClient.clear();
    setUser(null);
  };

  const authState: AuthState = { user, isLoading, login, register, logout };

  return (
    <ThemeProvider theme={DarkTheme}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthContext value={authState}>
          <RootNavigator />
        </AuthContext>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = use(AuthContext);

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)" />;

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={Colors.accent}>
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

      {/* Search tab last — combines with native search bar (per SDK 55 best practice) */}
      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
