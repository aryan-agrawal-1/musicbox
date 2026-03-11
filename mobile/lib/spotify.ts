import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { apiFetch } from './api';

/**
 * Launches the Spotify OAuth flow.
 * Returns true if the user successfully authenticated.
 * Returns false if the user cancelled or dismissed.
 * Throws on network/API errors.
 */
export async function connectSpotify(): Promise<boolean> {
  const scheme = Constants.expoConfig?.scheme ?? 'noted';
  const { auth_url } = await apiFetch<{ auth_url: string }>(
    `/api/v1/auth/spotify/connect/?redirect_scheme=${scheme}`,
  );
  const result = await WebBrowser.openAuthSessionAsync(
    auth_url,
    `${scheme}://spotify-callback`,
  );
  return result.type === 'success';
}
