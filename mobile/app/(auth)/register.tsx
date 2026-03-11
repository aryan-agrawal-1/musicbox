import { use, useState, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
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
import { pendingAppleAuth } from '@/lib/pending-apple-auth';
import { sharePreviewStore } from '@/lib/share-preview-store';
import { syncAppleMusicHistory } from '@/lib/apple-music';
import { useAppleMusicConnect } from '@/hooks/use-apple-music-connect';
import { AppleMusicConnectPanel } from '@/components/apple-music-connect-panel';
import { Colors } from '@/constants/colors';
import type { AuthTokens, Song } from '@/types/api';
import type { OnboardingTrackData } from '@/types/share';

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

type OnboardingStep = 'username' | 'account' | 'bio' | 'pfp' | 'apple-music' | 'tracks';

type CoreStep = 'username' | 'account' | 'bio' | 'pfp';
const CORE_STEPS: CoreStep[] = ['username', 'account', 'bio', 'pfp'];

function DotIndicator({ step, isAppleMode }: { step: CoreStep; isAppleMode?: boolean }) {
  const idx = CORE_STEPS.indexOf(step);

  const w0 = useSharedValue(idx === 0 ? 24 : 10);
  const w1 = useSharedValue(idx === 1 ? 24 : 10);
  const w2 = useSharedValue(idx === 2 ? 24 : 10);
  const w3 = useSharedValue(idx === 3 ? 24 : 10);

  useEffect(() => {
    w0.value = withSpring(idx === 0 ? 24 : 10, { damping: 20, stiffness: 200 });
    w1.value = withSpring(idx === 1 ? 24 : 10, { damping: 20, stiffness: 200 });
    w2.value = withSpring(idx === 2 ? 24 : 10, { damping: 20, stiffness: 200 });
    w3.value = withSpring(idx === 3 ? 24 : 10, { damping: 20, stiffness: 200 });
  }, [idx]);

  const s0 = useAnimatedStyle(() => ({
    width: w0.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(w0.value, [10, 24], [Colors.surfaceHigh, Colors.accent]),
  }));
  const s1 = useAnimatedStyle(() => ({
    width: w1.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(w1.value, [10, 24], [Colors.surfaceHigh, Colors.accent]),
  }));
  const s2 = useAnimatedStyle(() => ({
    width: w2.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(w2.value, [10, 24], [Colors.surfaceHigh, Colors.accent]),
  }));
  const s3 = useAnimatedStyle(() => ({
    width: w3.value,
    height: 10,
    borderRadius: 100,
    backgroundColor: interpolateColor(w3.value, [10, 24], [Colors.surfaceHigh, Colors.accent]),
  }));

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Animated.View style={s0} />
      {!isAppleMode && <Animated.View style={s1} />}
      <Animated.View style={s2} />
      <Animated.View style={s3} />
    </View>
  );
}

// Username

interface UsernameStepProps {
  username: string;
  setUsername: (v: string) => void;
  onContinue: () => void;
  onAppleComplete?: () => Promise<void>;
}

function UsernameStep({ username, setUsername, onContinue, onAppleComplete }: UsernameStepProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isAppleRegistering, setIsAppleRegistering] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);

  async function handlePress() {
    if (!onAppleComplete) { Keyboard.dismiss(); onContinue(); return; }
    setIsAppleRegistering(true);
    setAppleError(null);
    try {
      await onAppleComplete();
    } catch (e) {
      setAppleError(e instanceof ApiError ? e.message : 'Registration failed. Please try again.');
    } finally {
      setIsAppleRegistering(false);
    }
  }

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
        onPress={() => { Keyboard.dismiss(); router.back(); }}
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
            onSubmitEditing={() => { if (status === 'available' && !isAppleRegistering) handlePress(); }}
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
          {appleError && (
            <Text style={{ fontSize: 13, color: Colors.destructive, marginBottom: 8 }}>
              {appleError}
            </Text>
          )}
          <Pressable
            onPress={handlePress}
            disabled={status !== 'available' || isAppleRegistering}
            style={{
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: status === 'available' && !isAppleRegistering ? 1 : 0.35,
            }}
          >
            {isAppleRegistering
              ? <ActivityIndicator color="#000000" />
              : <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Continue →</Text>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Account creation

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountStepProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

function AccountStep({ username, onBack, onSuccess }: AccountStepProps) {
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 650);
    return () => clearTimeout(t);
  }, []);

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
      Keyboard.dismiss();
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
            ref={emailRef}
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

// Bio

interface BioStepProps {
  onBack?: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

function BioStep({ onBack, onContinue, onSkip }: BioStepProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const borderAnim = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderAnim.value, [0, 1], [Colors.surfaceHigh, Colors.accent]),
  }));

  useEffect(() => {
    // Keyboard may already be visible when arriving from a previous step
    const metrics = Keyboard.metrics();
    if (metrics) setKeyboardHeight(metrics.height);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Dismiss keyboard first so the next screen doesn't appear under an open keyboard
  async function dismissThenRun(fn: () => void | Promise<void>) {
    Keyboard.dismiss();
    if (Platform.OS === 'ios') await new Promise<void>(r => setTimeout(r, 250));
    await fn();
  }

  async function handleContinue() {
    const trimmed = bio.trim();
    if (!trimmed) {
      await dismissThenRun(onContinue);
      return;
    }
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      await apiFetch('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ bio: trimmed }),
      });
    } catch {
      // Best-effort — continue regardless
    } finally {
      setIsLoading(false);
      if (Platform.OS === 'ios') await new Promise<void>(r => setTimeout(r, 250));
      onContinue();
    }
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={16}
          style={{ position: 'absolute', top: insets.top + 12, left: 16, padding: 8, zIndex: 10 }}
        >
          <Text style={{ fontSize: 24, color: Colors.textPrimary }}>‹</Text>
        </Pressable>
      )}

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 80,
          paddingHorizontal: 24,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom + 32,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          Tell your{' '}
          <Text style={{ color: Colors.accent }}>story.</Text>
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: Colors.textSecondary,
            marginBottom: 32,
            lineHeight: 22,
          }}
        >
          A short bio helps others know what you're about.
        </Text>

        <Animated.View
          style={[
            {
              borderWidth: 1,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: Colors.surfaceElevated,
              padding: 16,
              minHeight: 128,
            },
            borderStyle,
          ]}
        >
          <TextInput
            ref={inputRef}
            value={bio}
            onChangeText={setBio}
            placeholder="Talk about your music taste, favourite albums, anything…"
            placeholderTextColor={Colors.textTertiary}
            style={{
              fontSize: 16,
              color: Colors.textPrimary,
              backgroundColor: 'transparent',
              minHeight: 80,
              textAlignVertical: 'top',
              lineHeight: 22,
            }}
            multiline
            maxLength={200}
            onFocus={() => { borderAnim.value = withTiming(1, { duration: 200 }); }}
            onBlur={() => { borderAnim.value = withTiming(0, { duration: 200 }); }}
          />
          {bio.length > 150 && (
            <Text
              style={{
                fontSize: 12,
                color: bio.length >= 190 ? Colors.destructive : Colors.textTertiary,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
                marginTop: 4,
              }}
            >
              {bio.length}/200
            </Text>
          )}
        </Animated.View>

        {/* Flex spacer — always at least 20px between box and buttons */}
        <View style={{ flex: 1, minHeight: 20 }} />

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={handleContinue}
            disabled={isLoading}
            style={{
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Continue →</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => dismissThenRun(onSkip)}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 15, color: Colors.textTertiary }}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// Profile picture

interface ProfilePictureStepProps {
  username: string;
  onBack?: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

function ProfilePictureStep({ username, onBack, onContinue, onSkip }: ProfilePictureStepProps) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerOpening, setIsPickerOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleAnim = useSharedValue(1);
  const avatarContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // Fire the pop-in AFTER React has painted the selected image, not before
  useEffect(() => {
    if (!imageUri) return;
    scaleAnim.value = withSequence(
      withTiming(0.85, { duration: 120 }),
      withSpring(1, { damping: 10, stiffness: 160 })
    );
  }, [imageUri]);

  async function pickImage() {
    setIsPickerOpening(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setError(null);
      }
    } finally {
      setIsPickerOpening(false);
    }
  }

  async function handleContinue() {
    if (!imageUri) {
      onContinue();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Get a presigned upload URL from the backend
      const { upload_url, public_url } = await apiFetch<{ upload_url: string; public_url: string }>(
        '/api/v1/auth/avatar/upload-url/',
        { method: 'POST', body: JSON.stringify({ content_type: 'image/jpeg' }) }
      );

      // Step 2: PUT the image bytes directly to Cloudflare R2
      const imageRes = await fetch(imageUri);
      const blob = await imageRes.blob();
      await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      // Step 3: Save the public URL on the user profile
      await apiFetch('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: public_url }),
      });

      onContinue();
    } catch {
      setError("Couldn't upload — you can add a photo later in Settings.");
      onContinue();
    } finally {
      setIsLoading(false);
    }
  }

  const initial = (username[0] ?? '?').toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={16}
          style={{ position: 'absolute', top: insets.top + 12, left: 16, padding: 8, zIndex: 10 }}
        >
          <Text style={{ fontSize: 24, color: Colors.textPrimary }}>‹</Text>
        </Pressable>
      )}

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 80,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          Add a{' '}
          <Text style={{ color: Colors.accent }}>photo.</Text>
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: Colors.textSecondary,
            marginBottom: 52,
            lineHeight: 22,
          }}
        >
          Put a face to the name.
        </Text>

        {/* Avatar picker */}
        <Animated.View style={[{ alignItems: 'center' }, avatarContainerStyle]}>
          <Pressable onPress={pickImage} disabled={isPickerOpening} style={{ opacity: isPickerOpening ? 0.5 : 1 }}>
            <View style={{ position: 'relative' }}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 120, height: 120, borderRadius: 60 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: Colors.surfaceElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: Colors.surfaceHigh,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 46,
                      fontWeight: '600',
                      color: Colors.textTertiary,
                    }}
                  >
                    {initial}
                  </Text>
                </View>
              )}

              {/* Camera badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: Colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: Colors.background,
                }}
              >
                <Image
                  source="sf:camera.fill"
                  style={{ width: 16, height: 16 }}
                  tintColor="#000000"
                  contentFit="contain"
                />
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={pickImage}
            disabled={isPickerOpening}
            style={{ marginTop: 18, paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 15, color: Colors.accent, fontWeight: '500' }}>
              {imageUri ? 'Change photo' : 'Choose from library'}
            </Text>
          </Pressable>
        </Animated.View>

        {error && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            style={{
              fontSize: 13,
              color: Colors.destructive,
              textAlign: 'center',
              marginTop: 16,
              lineHeight: 18,
            }}
          >
            {error}
          </Animated.Text>
        )}

        <View style={{ marginTop: 'auto', gap: 12 }}>
          <Pressable
            onPress={handleContinue}
            disabled={isLoading}
            style={{
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Continue →</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onSkip}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 15, color: Colors.textTertiary }}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Apple Music connect

interface AppleMusicStepProps {
  onConnected: (tracks: Song[]) => void;
  onSkip: () => void;
}

function AppleMusicStep({ onConnected, onSkip }: AppleMusicStepProps) {
  const insets = useSafeAreaInsets();

  const { connect: handleConnect, loadingLabel, connectingSubtitle, isConnecting, error } =
    useAppleMusicConnect(async () => {
      const songs = await syncAppleMusicHistory();
      const seen = new Set<number>();
      const unique = songs.filter(song => {
        if (seen.has(song.id)) return false;
        seen.add(song.id);
        return true;
      });
      onConnected(unique.slice(0, 5));
    });

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 32,
        justifyContent: 'center',
      }}
    >
      <AppleMusicConnectPanel
        title="One more thing."
        description="Connect Apple Music to import your listening history and get personalised picks."
        isConnecting={isConnecting}
        loadingLabel={loadingLabel}
        connectingSubtitle={connectingSubtitle}
        error={error}
        onConnect={handleConnect}
        onSkip={onSkip}
      />
    </View>
  );
}

// Recent track ratings

const TRACK_ENTRY_BASE_DELAY = 600;
const TRACK_ENTRY_STAGGER = 200;

// Mini half-star display (read-only)

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
  item: Song;
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
          {item.album_image ? (
            <Image
              source={{ uri: item.album_image }}
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
            {item.name}
          </Text>
          <Text
            style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {item.artists.map(a => a.name).join(', ')}
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

// Now playing indicator (3-bar animated waveform)

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
  tracks: Song[];
  onDone: () => void;
}

function TracksStep({ tracks, onDone }: TracksStepProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [isDone, setIsDone] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const pendingFinishAfterShareRef = useRef(false);
  const hasLeftForShareRef = useRef(false);

  // URL cache — ref so reads in async handlers are always fresh
  const previewUrls = useRef<Record<number, string>>({});
  const isSwitching = useRef(false);

  const player = useAudioPlayer(null);

  // Register rating callback so rate-song sheet can update cards immediately
  useEffect(() => {
    onboardingStore.setRatingCallback((songId, rating) => {
      setRatings(prev => ({ ...prev, [songId]: rating }));
    });
    return () => onboardingStore.clearRatingCallback();
  }, []);

  // Prefetch all Deezer previews in parallel on mount, then auto-play the first
  useEffect(() => {
    if (!tracks.length) return;
    Promise.all(
      tracks.map(item =>
        fetchDeezerPreview(item.artists[0]?.name ?? '', item.name).then(url => ({
          songId: item.id,
          url,
        }))
      )
    ).then(results => {
      results.forEach(({ songId, url }) => {
        if (url) previewUrls.current[songId] = url;
      });
      const firstUrl = previewUrls.current[tracks[0].id];
      if (firstUrl) {
        setCurrentPlayingId(tracks[0].id);
        player.replace(firstUrl);
        fadeIn(player);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => {
    if (pendingFinishAfterShareRef.current && hasLeftForShareRef.current) {
      pendingFinishAfterShareRef.current = false;
      hasLeftForShareRef.current = false;
      onDone();
    }

    return () => {
      if (pendingFinishAfterShareRef.current) {
        hasLeftForShareRef.current = true;
      }
    };
  }, [onDone]));

  async function switchToSong(item: Song) {
    if (isSwitching.current) return;
    isSwitching.current = true;
    try {
      if (currentPlayingId) await fadeOut(player);
      const url = previewUrls.current[item.id]
        ?? await fetchDeezerPreview(item.artists[0]?.name ?? '', item.name);
      if (url) {
        previewUrls.current[item.id] = url;
        setCurrentPlayingId(item.id);
        player.replace(url);
        await fadeIn(player);
      }
    } finally {
      isSwitching.current = false;
    }
  }

  function openRateSheet(item: Song) {
    // Only switch audio if tapping a different song
    if (item.id !== currentPlayingId) {
      switchToSong(item);
    }
    router.push({
      pathname: '/(auth)/rate-song',
      params: {
        songId: String(item.id),
        name: item.name,
        artists: JSON.stringify(item.artists),
        albumName: item.album_name,
        albumImage: item.album_image ?? '',
      },
    });
  }

  async function handleDone() {
    setIsDone(true);
    await fadeOut(player);
    if (ratedCount > 0) {
      const trackData: OnboardingTrackData[] = Object.entries(ratings)
        .slice(0, 9)
        .map(([idStr, rating]) => {
          const song = tracks.find(t => t.id === Number(idStr));
          return { songName: song?.name ?? '', albumImage: song?.album_image ?? null, rating };
        });
      const shareId = sharePreviewStore.set({
        variant: 'onboarding',
        tracks: trackData,
      });
      pendingFinishAfterShareRef.current = true;
      hasLeftForShareRef.current = false;
      router.push({ pathname: '/(auth)/share-preview', params: { shareId } });
    } else {
      onDone();
    }
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
            rating={ratings[item.id]}
            isActive={currentPlayingId === item.id}
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

// RegisterScreen

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);
  const [isAppleMode] = useState(() => pendingAppleAuth.get() !== null);

  const [step, setStep] = useState<OnboardingStep>('username');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [username, setUsername] = useState('');
  const [recentTracks, setRecentTracks] = useState<Song[]>([]);
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleAppleRegister() {
    const data = pendingAppleAuth.get();
    if (!data) throw new Error('Apple auth state lost. Please tap Continue with Apple again.');
    const tokens = await apiFetch<AuthTokens>('/api/v1/auth/apple/register/', {
      method: 'POST',
      body: JSON.stringify({
        identity_token: data.identityToken,
        username,
        email: data.email,
        full_name: data.fullName,
      }),
    });
    await tokenStore.setTokens(tokens.access, tokens.refresh);
    pendingAppleAuth.clear();
    setAccountCreated(true);
    advance('bio');
  }

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
    Keyboard.dismiss();
    setDirection(-1);
    requestAnimationFrame(() => setStep(to));
  }

  async function handleOnboardingComplete() {
    await auth.refreshUser();
    // Auth guard in root layout auto-redirects to tabs once user is set
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ gestureEnabled: !accountCreated }} />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Dot indicator — visible only during the four core steps */}
        {(step === 'username' || step === 'account' || step === 'bio' || step === 'pfp') && (
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
            <DotIndicator step={step as CoreStep} isAppleMode={isAppleMode} />
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
              onAppleComplete={isAppleMode ? handleAppleRegister : undefined}
            />
          )}
          {step === 'account' && (
            <AccountStep
              username={username}
              onBack={() => goBack('username')}
              onSuccess={() => { setAccountCreated(true); advance('bio'); }}
            />
          )}
          {step === 'bio' && (
            <BioStep
              onBack={accountCreated ? undefined : () => goBack(isAppleMode ? 'username' : 'account')}
              onContinue={() => advance('pfp')}
              onSkip={() => advance('pfp')}
            />
          )}
          {step === 'pfp' && (
            <ProfilePictureStep
              username={username}
              onBack={accountCreated ? undefined : () => goBack('bio')}
              onContinue={() => advance('apple-music')}
              onSkip={() => advance('apple-music')}
            />
          )}
          {step === 'apple-music' && (
            <AppleMusicStep
              onConnected={(tracks: Song[]) => {
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
