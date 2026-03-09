import { useState, useEffect } from 'react';
import { connectAppleMusic } from '@/lib/apple-music';
import { ApiError } from '@/lib/api';

export type AppleMusicConnectPhase = 'idle' | 'auth' | 'syncing' | 'loading';

export const APPLE_MUSIC_SYNC_MESSAGES = [
  'Connecting to Apple Music…',
  'Fetching your recent tracks…',
  'Matching your library…',
  'Almost there…',
] as const;

/**
 * Manages the Apple Music connect + sync flow with animated phase transitions.
 * Pass an `onSync` callback that runs during the 'syncing' phase after authorization.
 */
export function useAppleMusicConnect(onSync: () => Promise<void>) {
  const [phase, setPhase] = useState<AppleMusicConnectPhase>('idle');
  const [syncMsgIndex, setSyncMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'syncing') return;
    setSyncMsgIndex(0);
    const interval = setInterval(() => {
      setSyncMsgIndex(i => (i + 1) % APPLE_MUSIC_SYNC_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  const isConnecting = phase !== 'idle';

  const loadingLabel =
    phase === 'auth' ? 'Authorizing Apple Music…'
    : phase === 'syncing' ? APPLE_MUSIC_SYNC_MESSAGES[syncMsgIndex]
    : 'Finishing up…';

  const connectingSubtitle =
    phase === 'syncing'
      ? "This may take a moment if your tracks\naren't in our library yet."
      : undefined;

  async function connect() {
    setPhase('auth');
    setError(null);
    try {
      const connected = await connectAppleMusic();
      if (connected) {
        setPhase('syncing');
        await onSync();
        setPhase('loading');
      } else {
        setPhase('idle');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed. Try again.');
      setPhase('idle');
    }
  }

  return { connect, phase, loadingLabel, connectingSubtitle, isConnecting, error };
}
