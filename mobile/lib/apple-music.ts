import { requestAuthorization, getMusicUserToken } from 'apple-music-kit';
import { apiFetch } from '@/lib/api';
import type { Song } from '@/types/api';

function getStorefront(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = locale.split('-');
    // Locale can be "en-US" or just "en"; fall back to "us"
    return (parts[parts.length - 1] ?? 'us').toLowerCase();
  } catch {
    return 'us';
  }
}

/**
 * Full connect flow:
 *  1. Fetch developer token from backend (server-signed ES256 JWT)
 *  2. Request Apple Music authorization via native MusicKit
 *  3. Exchange developer token for Music-User-Token via native
 *  4. POST user token to backend for storage
 *
 * Returns true if fully connected, false if user denied authorization.
 */
export async function connectAppleMusic(): Promise<boolean> {
  const { token: devToken } = await apiFetch<{ token: string }>(
    '/api/v1/auth/apple-music/developer-token/'
  );

  const authStatus = await requestAuthorization();
  if (authStatus !== 'authorized') return false;

  const userToken = await getMusicUserToken(devToken);

  await apiFetch('/api/v1/auth/apple-music/connect/', {
    method: 'POST',
    body: JSON.stringify({ user_token: userToken, storefront: getStorefront() }),
  });

  return true;
}

/**
 * Trigger backend sync of Apple Music recently-played tracks.
 * Returns the matched/created Song records.
 */
export async function syncAppleMusicHistory(): Promise<Song[]> {
  const data = await apiFetch<{ synced: number; songs: Song[] }>(
    '/api/v1/music/apple-music/sync/',
    { method: 'POST' }
  );
  return data.songs;
}

export async function disconnectAppleMusic(): Promise<void> {
  await apiFetch('/api/v1/auth/apple-music/disconnect/', { method: 'POST' });
}
