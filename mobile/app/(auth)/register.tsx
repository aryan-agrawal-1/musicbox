import { use, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  interpolateColor,
  FadeIn,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';

import { AuthContext } from '@/contexts/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { tokenStore } from '@/lib/auth';
import { onboardingStore } from '@/lib/onboarding-store';
import { Colors } from '@/constants/colors';
import type { AuthTokens, ListeningHistory, PaginatedResponse } from '@/types/api';

async function fetchDeezerPreview(artist: string, track: string): Promise<string | null> {
  if (process.env.EXPO_OS === 'web') return null;
  try {
    const q = encodeURIComponent(`artist:"${artist}" track:"${track}"`);
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data?.[0]?.preview as string) ?? null;
  } catch {
    return null;
  }
}

async function fadeOut(player: AudioPlayer): Promise<void> {
  for (let i = 10; i >= 0; i--) {
    player.volume = i / 10;
    await new Promise<void>(r => setTimeout(r, 25));
  }
  player.pause();
  player.volume = 1;
}

async function fadeIn(player: AudioPlayer): Promise<void> {
  player.volume = 0;
  player.play();
  for (let i = 0; i <= 10; i++) {
    player.volume = i / 10;
    await new Promise<void>(r => setTimeout(r, 25));
  }
}

type OnboardingStep = 'username' | 'account' | 'spotify' | 'tracks';

// ---------------------------------------------------------------------------
// DotIndicator
// ---------------------------------------------------------------------------

function DotIndicator({ step }: { step: 'username' | 'account' }) {
  const dot1Width = useSharedValue(step === 'username' ? 24 : 10);
  const dot2Width = useSharedValue(step === 'account' ? 24 : 10);

  useEffect(() => {
    dot1Width.value = withSpring(step === 'username' ? 24 : 10, { damping: 20, stiffness: 200 });
    dot2Width.value = withSpring(step === 'account' ? 24 : 10, { damping: 20, stiffness: 200 });
  }, [step, dot1Width, dot2Width]);

  const dot1Style = useAnimatedStyle(() => ({
    width: dot1Width.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(
      dot1Width.value,
      [10, 24],
      [Colors.surfaceHigh, Colors.accent]
    ),
  }));

  const dot2Style = useAnimatedStyle(() => ({
    width: dot2Width.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(
      dot2Width.value,
      [10, 24],
      [Colors.surfaceHigh, Colors.accent]
    ),
  }));

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Animated.View style={dot1Style} />
      <Animated.View style={dot2Style} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Username
// ---------------------------------------------------------------------------

interface UsernameStepProps {
  username: string;
  setUsername: (v: string) => void;
  onContinue: () => void;
}

function UsernameStep({ username, setUsername, onContinue }: UsernameStepProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const borderAnim = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(borderAnim.value, [0, 1], [Colors.separator, Colors.accent]),
  }));

  // Auto-focus after slide animation settles
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 650);
    return () => clearTimeout(t);
  }, []);

  // Debounced availability check
  useEffect(() => {
    const REGEX = /^[a-zA-Z0-9_]{3,30}$/;
    if (!REGEX.test(username)) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    const t = setTimeout(async () => {
      try {
        await apiFetch(`/api/v1/auth/users/${username}/`);
        setStatus('taken'); // 200 = user exists = taken
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setStatus('available');
        } else {
          setStatus('idle');
        }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  return (
    <View style={{ flex: 1 }}>
      {/* Back */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={16}
        style={{ position: 'absolute', top: insets.top + 12, left: 16, padding: 8, zIndex: 10 }}
      >
        <Text style={{ fontSize: 24, color: Colors.textPrimary }}>‹</Text>
      </Pressable>

      <View style={{ flex: 1, paddingTop: insets.top + 80, paddingHorizontal: 24, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom + 32 }}>
        {/* Title */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 40,
          }}
        >
          Claim your{' '}
          <Text
            style={{
              color: Colors.accent,
            }}
          >
            username
          </Text>
        </Text>


        {/* Input row */}
        <Animated.View
          style={[
            { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
            borderStyle,
          ]}
        >
          <Text style={{ fontSize: 22, color: Colors.textTertiary, marginRight: 4 }}>@</Text>
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: 22, color: Colors.textPrimary, paddingVertical: 8, backgroundColor: Colors.background }}
            placeholder="username"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            returnKeyType="done"
            onSubmitEditing={() => { if (status === 'available') onContinue(); }}
            value={username}
            onChangeText={v => setUsername(v.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''))}
            onFocus={() => { borderAnim.value = withTiming(1, { duration: 200 }); }}
            onBlur={() => { borderAnim.value = withTiming(0, { duration: 200 }); }}
          />
        </Animated.View>

        {/* Availability status */}
        <View style={{ height: 26, marginTop: 10, justifyContent: 'center' }}>
          {status === 'checking' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color={Colors.textTertiary} />
              <Text style={{ fontSize: 14, color: Colors.textTertiary }}>Checking…</Text>
            </View>
          )}
          {status === 'available' && (
            <Text style={{ fontSize: 14, color: Colors.positive }}>● {username} is available</Text>
          )}
          {status === 'taken' && (
            <Text style={{ fontSize: 14, color: Colors.destructive }}>● {username} is taken</Text>
          )}
        </View>

        <Text
          style={{ fontSize: 12, color: Colors.textTertiary, marginTop: 6, lineHeight: 18 }}
        >
          3–30 characters · letters, numbers, underscores only
        </Text>

        {/* Continue — pushed to bottom via marginTop auto */}
        <View style={{ marginTop: 'auto' }}>
          <Pressable
            onPress={onContinue}
            disabled={status !== 'available'}
            style={{
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: status === 'available' ? 1 : 0.35,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Continue →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Account creation
// ---------------------------------------------------------------------------

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountStepProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

function AccountStep({ username, onBack, onSuccess }: AccountStepProps) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailBorder = useSharedValue(0);
  const passwordBorder = useSharedValue(0);
  const confirmBorder = useSharedValue(0);

  const emailBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(emailBorder.value, [0, 1], [Colors.separator, Colors.accent]),
  }));
  const passwordBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(passwordBorder.value, [0, 1], [Colors.separator, Colors.accent]),
  }));
  const confirmBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(confirmBorder.value, [0, 1], [Colors.separator, Colors.accent]),
  }));

  // Debounced email availability check
  useEffect(() => {
    if (!SIMPLE_EMAIL.test(email)) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch<{ available: boolean }>(
          `/api/v1/auth/check-email/?email=${encodeURIComponent(email)}`
        );
        setEmailStatus(res.available ? 'available' : 'taken');
      } catch {
        setEmailStatus('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [email]);

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordLongEnough = password.length >= 8;
  const canSubmit =
    SIMPLE_EMAIL.test(email) &&
    emailStatus === 'available' &&
    passwordLongEnough &&
    passwordsMatch &&
    !isLoading;

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch('/api/v1/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          password_confirm: confirm,
          first_name: '',
          last_name: '',
        }),
      });
      const tokens = await apiFetch<AuthTokens>('/api/v1/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await tokenStore.setTokens(tokens.access, tokens.refresh);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const msgs: string[] = [];
        for (const key of ['email', 'password', 'username', 'non_field_errors']) {
          const v = err.data[key];
          if (v) {
            const errs = Array.isArray(v) ? v : [v];
            msgs.push(...errs.map(String));
          }
        }
        setError(msgs.length ? msgs.join('\n') : err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 80,
        paddingBottom: insets.bottom + 40,
      }}
    >
      {/* Back */}
      <Pressable
        onPress={onBack}
        hitSlop={16}
        style={{ position: 'absolute', top: insets.top + 12, left: 16, padding: 8 }}
      >
        <Text style={{ fontSize: 24, color: Colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontSize: 34,
          fontWeight: '700',
          color: Colors.textPrimary,
          letterSpacing: -0.5,
          marginBottom: 32,
        }}
      >
        Almost there.
      </Text>

      <View style={{ gap: 16 }}>
        {/* Email */}
        <Animated.View
          style={[{ borderBottomWidth: 1, paddingBottom: 2 }, emailBorderStyle]}
        >
          <TextInput
            style={{ fontSize: 17, color: Colors.textPrimary, paddingVertical: 12, backgroundColor: Colors.background }}
            placeholder="Email address"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
            onFocus={() => { emailBorder.value = withTiming(1, { duration: 200 }); }}
            onBlur={() => { emailBorder.value = withTiming(0, { duration: 200 }); }}
          />
        </Animated.View>

        {/* Email status hint */}
        {emailStatus === 'checking' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8 }}>
            <ActivityIndicator size="small" color={Colors.textTertiary} />
            <Text style={{ fontSize: 13, color: Colors.textTertiary }}>Checking…</Text>
          </View>
        )}
        {emailStatus === 'taken' && (
          <Text style={{ fontSize: 13, color: Colors.destructive, marginTop: -8 }}>
            An account with this email already exists
          </Text>
        )}

        {/* Password */}
        <Animated.View
          style={[
            { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
            passwordBorderStyle,
          ]}
        >
          <TextInput
            style={{ flex: 1, fontSize: 17, color: Colors.textPrimary, paddingVertical: 12, backgroundColor: Colors.background }}
            placeholder="Password"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            value={password}
            onChangeText={setPassword}
            onFocus={() => { passwordBorder.value = withTiming(1, { duration: 200 }); }}
            onBlur={() => { passwordBorder.value = withTiming(0, { duration: 200 }); }}
          />
          <Pressable
            onPress={() => setShowPassword(v => !v)}
            style={{ paddingHorizontal: 8, paddingVertical: 12 }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 14, color: Colors.textSecondary, fontWeight: '500' }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Password length hint */}
        {password.length > 0 && !passwordLongEnough && (
          <Text style={{ fontSize: 13, color: Colors.destructive, marginTop: -8 }}>
            Password must be at least 8 characters
          </Text>
        )}

        {/* Confirm password */}
        <Animated.View
          style={[
            { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
            confirmBorderStyle,
          ]}
        >
          <TextInput
            style={{ flex: 1, fontSize: 17, color: Colors.textPrimary, paddingVertical: 12, backgroundColor: Colors.background }}
            placeholder="Confirm password"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry={!showConfirm}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => { if (canSubmit) handleSubmit(); }}
            value={confirm}
            onChangeText={setConfirm}
            onFocus={() => { confirmBorder.value = withTiming(1, { duration: 200 }); }}
            onBlur={() => { confirmBorder.value = withTiming(0, { duration: 200 }); }}
          />
          <Pressable
            onPress={() => setShowConfirm(v => !v)}
            style={{ paddingHorizontal: 8, paddingVertical: 12 }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 14, color: Colors.textSecondary, fontWeight: '500' }}>
              {showConfirm ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Password match indicator */}
        {confirm.length > 0 && (
          <Text
            style={{
              fontSize: 13,
              color: passwordsMatch ? Colors.positive : Colors.destructive,
            }}
          >
            {passwordsMatch ? '✓ Passwords match' : "Passwords don't match"}
          </Text>
        )}

        {/* Error */}
        {error && (
          <Text style={{ fontSize: 13, color: Colors.destructive, lineHeight: 18 }}>
            {error}
          </Text>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            height: 52,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
            opacity: canSubmit ? 1 : 0.4,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
              Create account
            </Text>
          )}
        </Pressable>

        <Text
          style={{
            fontSize: 12,
            color: Colors.textTertiary,
            textAlign: 'center',
            lineHeight: 18,
            marginTop: 4,
          }}
        >
          By creating an account you agree to our Terms &amp; Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Spotify connect
// ---------------------------------------------------------------------------

type ConnectPhase = 'idle' | 'auth' | 'syncing' | 'loading';

const SYNC_MESSAGES = [
  'Syncing your listening history…',
  'Importing recent tracks…',
  'Building your music profile…',
  'Almost there…',
];

interface SpotifyStepProps {
  onConnected: (tracks: ListeningHistory[]) => void;
  onSkip: () => void;
}

function SpotifyStep({ onConnected, onSkip }: SpotifyStepProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<ConnectPhase>('idle');
  const [syncMsgIndex, setSyncMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isConnecting = phase !== 'idle';

  // Cycle through sync messages while in 'syncing' phase
  useEffect(() => {
    if (phase !== 'syncing') return;
    setSyncMsgIndex(0);
    const interval = setInterval(() => {
      setSyncMsgIndex(i => (i + 1) % SYNC_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  const loadingLabel =
    phase === 'auth' ? 'Opening Spotify…'
    : phase === 'syncing' ? SYNC_MESSAGES[syncMsgIndex]
    : 'Finishing up…';

  async function handleConnect() {
    setPhase('auth');
    setError(null);
    try {
      const scheme = Constants.expoConfig?.scheme ?? 'muze';
      const { auth_url } = await apiFetch<{ auth_url: string }>(
        `/api/v1/auth/spotify/connect/?redirect_scheme=${scheme}`
      );
      const result = await WebBrowser.openAuthSessionAsync(
        auth_url,
        `${scheme}://spotify-callback`
      );
      if (result.type === 'success') {
        setPhase('syncing');
        await apiFetch('/api/v1/music/listening-history/sync/', { method: 'POST' });
        setPhase('loading');
        const data = await apiFetch<PaginatedResponse<ListeningHistory>>(
          '/api/v1/music/listening-history/?page=1'
        );
        // Deduplicate by spotify_id — keep only the most-recent play per song
        const seen = new Set<string>();
        const unique = data.results.filter(item => {
          if (seen.has(item.song.spotify_id)) return false;
          seen.add(item.song.spotify_id);
          return true;
        });
        onConnected(unique.slice(0, 5));
      } else {
        setPhase('idle');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed. Try again.');
      setPhase('idle');
    }
  }

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Glow */}
      <View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(29, 185, 84, 0.07)',
        }}
      />

      {/* Spotify circle */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: Colors.spotifyGreen,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#000000' }}>S</Text>
      </View>

      <Text
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: Colors.textPrimary,
          textAlign: 'center',
          letterSpacing: -0.5,
          marginBottom: 12,
        }}
      >
        One more thing.
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 32,
        }}
      >
        Connect Spotify to unlock your listening history and personalised picks.
      </Text>

      {/* Benefits */}
      <View style={{ gap: 10, width: '100%', marginBottom: 40 }}>
        {[
          'Import your recent listening',
          'Auto-sync new listens daily',
          'Rate tracks directly from history',
        ].map(benefit => (
          <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 16, color: Colors.positive }}>✓</Text>
            <Text style={{ fontSize: 15, color: Colors.textSecondary }}>{benefit}</Text>
          </View>
        ))}
      </View>

      {error && (
        <Text
          style={{
            fontSize: 13,
            color: Colors.destructive,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      )}

      {/* Loading state */}
      {isConnecting ? (
        <View style={{ width: '100%', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator color={Colors.spotifyGreen} size="large" />
          <Animated.Text
            key={loadingLabel}
            entering={FadeInDown.duration(280)}
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: Colors.textPrimary,
              textAlign: 'center',
            }}
          >
            {loadingLabel}
          </Animated.Text>
          {phase === 'syncing' && (
            <Text
              style={{
                fontSize: 13,
                color: Colors.textTertiary,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              This may take a moment if your tracks{'\n'}aren't in our library yet.
            </Text>
          )}
        </View>
      ) : (
        <>
          {/* Connect button */}
          <Pressable
            onPress={handleConnect}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.spotifyGreen,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
              Connect with Spotify
            </Text>
          </Pressable>

          {/* Skip */}
          <Pressable onPress={onSkip} style={{ marginTop: 20 }} hitSlop={12}>
            <Text style={{ fontSize: 14, color: Colors.textTertiary }}>Skip for now →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Recent track ratings
// ---------------------------------------------------------------------------

const TRACK_ENTRY_BASE_DELAY = 600;
const TRACK_ENTRY_STAGGER = 200;

// ---------------------------------------------------------------------------
// Mini half-star display (read-only)
// ---------------------------------------------------------------------------

const MINI_STAR = 14;

function MiniStars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return (
          <View key={star} style={{ width: MINI_STAR, height: MINI_STAR }}>
            <Text
              style={{
                fontSize: MINI_STAR,
                position: 'absolute',
                color: 'rgba(255, 255, 255, 0.15)',
                lineHeight: MINI_STAR,
              }}
            >
              ★
            </Text>
            {fill > 0 && (
              <View style={{ position: 'absolute', width: MINI_STAR * fill, overflow: 'hidden' }}>
                <Text style={{ fontSize: MINI_STAR, color: Colors.accent, lineHeight: MINI_STAR }}>
                  ★
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

interface TrackCardProps {
  item: ListeningHistory;
  index: number;
  rating: number | undefined;
  isActive: boolean;
  onPress: () => void;
}

function TrackCard({
  item,
  index,
  rating,
  isActive,
  onPress,
}: TrackCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const shineX = useSharedValue(-120);

  const entryDelay = TRACK_ENTRY_BASE_DELAY + index * TRACK_ENTRY_STAGGER;

  useEffect(() => {
    opacity.value = withDelay(entryDelay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      entryDelay,
      withSpring(0, { damping: 22, stiffness: 140 })
    );
    shineX.value = withDelay(
      entryDelay + 400,
      withTiming(400, { duration: 600 })
    );
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }, { skewX: '-15deg' }],
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          cardAnimStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 14,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor:
              rating !== undefined ? Colors.accentDim : Colors.surfaceElevated,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Shine sweep */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
            },
            shineStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Accent bar for rated state */}
        {rating !== undefined && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 2,
              backgroundColor: Colors.accent,
            }}
          />
        )}

        {/* Album art */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: Colors.surfaceHigh,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {item.song.album_image ? (
            <Image
              source={{ uri: item.song.album_image }}
              style={{ width: 52, height: 52 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>♪</Text>
            </View>
          )}
          {isActive && <NowPlayingIndicator />}
        </View>

        {/* Track info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
            numberOfLines={1}
          >
            {item.song.name}
          </Text>
          <Text
            style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {item.song.artists.map(a => a.name).join(', ')}
          </Text>
          {rating !== undefined && <MiniStars value={rating} />}
        </View>

        {/* Rate chevron */}
        {rating === undefined && (
          <Text style={{ fontSize: 18, color: Colors.textTertiary, flexShrink: 0 }}>›</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Now playing indicator (3-bar animated waveform)
// ---------------------------------------------------------------------------

function NowPlayingIndicator() {
  const b1 = useSharedValue(0.4);
  const b2 = useSharedValue(1.0);
  const b3 = useSharedValue(0.7);

  useEffect(() => {
    b1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    b2.value = withRepeat(withDelay(150, withTiming(0.3, { duration: 350 })), -1, true);
    b3.value = withRepeat(withDelay(80, withTiming(0.8, { duration: 500 })), -1, true);
  }, []);

  const s1 = useAnimatedStyle(() => ({ height: 10 * b1.value }));
  const s2 = useAnimatedStyle(() => ({ height: 10 * b2.value }));
  const s3 = useAnimatedStyle(() => ({ height: 10 * b3.value }));

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
      }}
    >
      {[s1, s2, s3].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            { width: 3, backgroundColor: Colors.accent, borderRadius: 1.5, minHeight: 3 },
            style,
          ]}
        />
      ))}
    </View>
  );
}

interface TracksStepProps {
  tracks: ListeningHistory[];
  onDone: () => void;
}

function TracksStep({ tracks, onDone }: TracksStepProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isDone, setIsDone] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  // URL cache — ref so reads in async handlers are always fresh
  const previewUrls = useRef<Record<string, string>>({});
  const isSwitching = useRef(false);

  const player = useAudioPlayer(null);

  // Register rating callback so rate-song sheet can update cards immediately
  useEffect(() => {
    onboardingStore.setRatingCallback((spotifyId, _songId, rating) => {
      setRatings(prev => ({ ...prev, [spotifyId]: rating }));
    });
    return () => onboardingStore.clearRatingCallback();
  }, []);

  // Prefetch all Deezer previews in parallel on mount, then auto-play the first
  useEffect(() => {
    if (!tracks.length) return;
    Promise.all(
      tracks.map(item =>
        fetchDeezerPreview(item.song.artists[0]?.name ?? '', item.song.name).then(url => ({
          spotifyId: item.song.spotify_id,
          url,
        }))
      )
    ).then(results => {
      results.forEach(({ spotifyId, url }) => {
        if (url) previewUrls.current[spotifyId] = url;
      });
      const firstUrl = previewUrls.current[tracks[0].song.spotify_id];
      if (firstUrl) {
        setCurrentPlayingId(tracks[0].song.spotify_id);
        player.replace(firstUrl);
        fadeIn(player);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchToSong(item: ListeningHistory) {
    if (isSwitching.current) return;
    isSwitching.current = true;
    try {
      if (currentPlayingId) await fadeOut(player);
      const url = previewUrls.current[item.song.spotify_id]
        ?? await fetchDeezerPreview(item.song.artists[0]?.name ?? '', item.song.name);
      if (url) {
        previewUrls.current[item.song.spotify_id] = url;
        setCurrentPlayingId(item.song.spotify_id);
        player.replace(url);
        await fadeIn(player);
      }
    } finally {
      isSwitching.current = false;
    }
  }

  function openRateSheet(item: ListeningHistory) {
    // Only switch audio if tapping a different song
    if (item.song.spotify_id !== currentPlayingId) {
      switchToSong(item);
    }
    router.push({
      pathname: '/(auth)/rate-song',
      params: {
        spotifyId: item.song.spotify_id,
        songId: String(item.song.id),
        name: item.song.name,
        artists: JSON.stringify(item.song.artists),
        albumName: item.song.album_name,
        albumImage: item.song.album_image ?? '',
      },
    });
  }

  async function handleDone() {
    setIsDone(true);
    await fadeOut(player);
    onDone();
  }

  const ratedCount = Object.keys(ratings).length;
  const doneButtonDelay = TRACK_ENTRY_BASE_DELAY + tracks.length * TRACK_ENTRY_STAGGER;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 56, paddingHorizontal: 24 }}>
      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: Colors.textPrimary,
          letterSpacing: -0.5,
        }}
      >
        Your recent listens
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(400).duration(400)}
        style={{
          fontSize: 16,
          color: Colors.textSecondary,
          marginTop: 4,
          marginBottom: 28,
        }}
      >
        Rate anything you remember
      </Animated.Text>

      <View style={{ gap: 10 }}>
        {tracks.map((item, index) => (
          <TrackCard
            key={item.id}
            item={item}
            index={index}
            rating={ratings[item.song.spotify_id]}
            isActive={currentPlayingId === item.song.spotify_id}
            onPress={() => openRateSheet(item)}
          />
        ))}
      </View>

      {/* Done button — pinned to bottom */}
      <Animated.View
        entering={FadeIn.delay(doneButtonDelay).duration(400)}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 32,
          left: 24,
          right: 24,
        }}
      >
        <Pressable
          onPress={handleDone}
          disabled={isDone}
          style={{
            height: 52,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isDone ? 0.5 : 1,
          }}
        >
          {isDone ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
              {ratedCount > 0 ? `Done  ·  ${ratedCount} rated` : 'Done →'}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main shell — RegisterScreen
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);

  const [step, setStep] = useState<OnboardingStep>('username');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [username, setUsername] = useState('');
  const [recentTracks, setRecentTracks] = useState<ListeningHistory[]>([]);

  const enterAnimation =
    direction === 1
      ? SlideInRight.springify().damping(50).stiffness(200)
      : SlideInLeft.springify().damping(50).stiffness(200);

  const exitAnimation =
    direction === 1
      ? SlideOutLeft.springify().damping(50).stiffness(200)
      : SlideOutRight.springify().damping(50).stiffness(200);

  function advance(to: OnboardingStep) {
    setDirection(1);
    requestAnimationFrame(() => setStep(to));
  }

  function goBack(to: OnboardingStep) {
    setDirection(-1);
    requestAnimationFrame(() => setStep(to));
  }

  async function handleOnboardingComplete() {
    await auth.refreshUser();
    // Auth guard in root layout auto-redirects to tabs once user is set
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Dot indicator — visible only during first two steps */}
        {(step === 'username' || step === 'account') && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: insets.top + 22,
              left: 0,
              right: 0,
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <DotIndicator step={step} />
          </View>
        )}

        {/* Animated step container */}
        <Animated.View
          key={step}
          entering={enterAnimation}
          exiting={exitAnimation}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {step === 'username' && (
            <UsernameStep
              username={username}
              setUsername={setUsername}
              onContinue={() => advance('account')}
            />
          )}
          {step === 'account' && (
            <AccountStep
              username={username}
              onBack={() => goBack('username')}
              onSuccess={() => advance('spotify')}
            />
          )}
          {step === 'spotify' && (
            <SpotifyStep
              onConnected={tracks => {
                setRecentTracks(tracks);
                advance('tracks');
              }}
              onSkip={handleOnboardingComplete}
            />
          )}
          {step === 'tracks' && (
            <TracksStep tracks={recentTracks} onDone={handleOnboardingComplete} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
