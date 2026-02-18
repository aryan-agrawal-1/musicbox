import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

export async function refreshAccessToken(): Promise<string> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) throw new Error('No refresh token');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/v1/token/refresh/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }
  );

  if (!response.ok) {
    await tokenStore.clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = (await response.json()) as { access: string; refresh?: string };
  // Refresh tokens rotate automatically — update both if a new refresh is returned
  if (data.refresh) {
    await tokenStore.setTokens(data.access, data.refresh);
  } else {
    await SecureStore.setItemAsync('access_token', data.access);
  }
  return data.access;
}
