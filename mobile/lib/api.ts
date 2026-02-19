import * as SecureStore from 'expo-secure-store';
import { refreshAccessToken } from '@/lib/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: Record<string, unknown>
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
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      try {
        await getRefreshedToken();
      } catch {
        throw new ApiError('Session expired', 401);
      }
      return apiFetch<T>(path, options, true);
    }
    // No refresh token (e.g. login attempt) — fall through to error handling below
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as Record<string, unknown>;
    const nonFieldErrors = Array.isArray(error.non_field_errors) ? (error.non_field_errors[0] as string) : undefined;
    throw new ApiError(
      (error.detail as string) || nonFieldErrors || (error.message as string) || 'Request failed',
      response.status,
      error.code as string | undefined,
      error
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
