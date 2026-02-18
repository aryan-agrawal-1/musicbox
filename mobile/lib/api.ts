import * as SecureStore from 'expo-secure-store';
import { refreshAccessToken } from '@/lib/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Deduplicate concurrent refresh attempts
let refreshPromise: Promise<string> | null = null;

async function getRefreshedToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (response.status === 401 && !_isRetry) {
    try {
      await getRefreshedToken();
    } catch {
      throw new ApiError('Session expired', 401);
    }
    return apiFetch<T>(path, options, true);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as Record<string, string>;
    throw new ApiError(
      error.detail || error.message || 'Request failed',
      response.status,
      error.code
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
