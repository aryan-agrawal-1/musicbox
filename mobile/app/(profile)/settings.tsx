import { use, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { connectSpotify } from '@/lib/spotify';
import { AvatarImage } from '@/components/avatar-image';
import { apiFetch } from '@/lib/api';
import { useSyncListeningHistory } from '@/hooks/use-diary';
import { useAvatarUpload } from '@/hooks/use-avatar';
import { displayName } from '@/components/profile-tabs';
import type { User } from '@/types/api';

// ─── Local sub-components ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 4,
        marginBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

function RowSeparator({ inset = 16 }: { inset?: number }) {
  return (
    <View
      style={{ height: 1, backgroundColor: Colors.separator, marginLeft: inset }}
    />
  );
}

function Chevron() {
  return (
    <Image
      source="sf:chevron.right"
      style={{ width: 8, height: 13 }}
      tintColor={Colors.textTertiary}
    />
  );
}

interface RowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  rightContent?: React.ReactNode;
  centerLabel?: boolean;
  hideChevron?: boolean;
}

function SettingsRow({
  label,
  value,
  onPress,
  destructive = false,
  loading = false,
  disabled = false,
  rightContent,
  centerLabel = false,
  hideChevron = false,
}: RowProps) {
  const showChevron = !!onPress && !loading && !rightContent && !value && !hideChevron;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || loading || disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        minHeight: 52,
        gap: 12,
        opacity: pressed && onPress && !loading ? 0.55 : disabled ? 0.4 : 1,
        justifyContent: centerLabel ? 'center' : 'flex-start',
      })}
    >
      <Text
        style={{
          flex: centerLabel ? undefined : 1,
          fontSize: 17,
          color: destructive ? Colors.destructive : Colors.textPrimary,
          textAlign: centerLabel ? 'center' : 'left',
          fontWeight: destructive ? '500' : '400',
        }}
      >
        {label}
      </Text>
      {loading && <ActivityIndicator size="small" color={Colors.textTertiary} />}
      {!loading && rightContent}
      {!loading && !rightContent && value && (
        <Text
          style={{ fontSize: 17, color: Colors.textSecondary, flexShrink: 1 }}
          selectable
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      {showChevron && <Chevron />}
    </Pressable>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderRadius: 16,
        // @ts-ignore
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const auth = use(AuthContext);
  const router = useRouter();
  const user = auth.user;

  const syncMutation = useSyncListeningHistory();
  const { avatarLoading, pickAndUploadAvatar, removeAvatar } = useAvatarUpload(auth.refreshUser);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch<void>('/api/v1/auth/spotify/disconnect/', { method: 'POST' }),
    onSuccess: () => auth.refreshUser(),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => auth.deleteAccount(),
  });

  if (!user) return null;

  const name = displayName(user);
  const version = Constants.expoConfig?.version ?? '—';
  const connectedSince = user.spotify_connected_at
    ? new Date(user.spotify_connected_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // ── Avatar handlers ──────────────────────────────────────────────────────

  function handleAvatarPress() {
    const hasPhoto = !!user.avatar_url;

    if (process.env.EXPO_OS === 'ios') {
      const options = ['Cancel', 'Choose from Library'];
      if (hasPhoto) options.push('Remove Photo');

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: hasPhoto ? options.length - 1 : undefined,
        },
        (index) => {
          if (index === 1) pickAndUploadAvatar();
          if (hasPhoto && index === 2) removeAvatar();
        },
      );
    } else {
      const buttons: Parameters<typeof Alert.alert>[2] = [
        { text: 'Choose from Library', onPress: pickAndUploadAvatar },
      ];
      if (hasPhoto) {
        buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: removeAvatar });
      }
      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Change Photo', undefined, buttons);
    }
  }

  // ── Action handlers ──────────────────────────────────────────────────────

  async function handleConnectSpotify() {
    setSpotifyConnecting(true);
    try {
      const connected = await connectSpotify();
      if (connected) {
        await auth.refreshUser();
        if (process.env.EXPO_OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      Alert.alert(
        'Connection Failed',
        err instanceof Error ? err.message : 'Could not connect Spotify. Please try again.',
      );
    } finally {
      setSpotifyConnecting(false);
    }
  }

  function handleSyncPress() {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
    });
  }

  function handleDisconnectSpotify() {
    Alert.alert(
      'Disconnect Spotify',
      'Your listening history will stop syncing. Previously synced history will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate(),
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your ratings, reviews, and listening history will be permanently lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => deleteAccountMutation.mutate(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  function handleSignOut() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => auth.logout() },
    ]);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerLargeTitle: false }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 52,
          gap: 24,
        }}
      >
        {/* ── Account ── */}
        <Section>
          {/* Avatar / identity hero row */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={avatarLoading}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingTop: 28,
              paddingBottom: 20,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View>
              {avatarLoading ? (
                <View
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    backgroundColor: Colors.surfaceElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator color={Colors.accent} />
                </View>
              ) : (
                <AvatarImage uri={user.avatar_url} size={76} displayName={name} />
              )}

              {/* Camera badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: Colors.surfaceHigh,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 0 2.5px ${Colors.surface}`,
                }}
              >
                <Image
                  source="sf:camera.fill"
                  style={{ width: 12, height: 10 }}
                  tintColor={Colors.textPrimary}
                />
              </View>
            </View>

            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: Colors.textPrimary,
                  letterSpacing: -0.2,
                }}
              >
                {name}
              </Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary }}>
                @{user.username}
              </Text>
            </View>

            <Text
              style={{ fontSize: 14, color: Colors.accent, fontWeight: '500' }}
            >
              Change Photo
            </Text>
          </Pressable>

          <RowSeparator />

          <SettingsRow
            label="Edit Profile"
            onPress={() => router.push('/(profile)/edit-profile')}
          />

          <RowSeparator />

          <SettingsRow
            label="Username"
            onPress={() => router.push('/(profile)/change-username')}
            rightContent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ fontSize: 17, color: Colors.textSecondary }}
                  numberOfLines={1}
                >
                  {user.username}
                </Text>
                <Chevron />
              </View>
            }
          />

          <RowSeparator />

          <SettingsRow
            label="Email"
            onPress={() => router.push('/(profile)/change-email')}
            rightContent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ fontSize: 17, color: Colors.textSecondary, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
                <Chevron />
              </View>
            }
          />

          <RowSeparator />

          <SettingsRow
            label="Change Password"
            onPress={() => router.push('/(profile)/change-password')}
          />
        </Section>

        {/* ── Spotify ── */}
        <View>
          <SectionHeader title="Spotify" />
          <Section>
            <SettingsRow
              label="Status"
              rightContent={
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: user.is_spotify_connected
                        ? Colors.positive
                        : Colors.textTertiary,
                    }}
                  />
                  <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
                    {user.is_spotify_connected
                      ? connectedSince
                        ? `Since ${connectedSince}`
                        : 'Connected'
                      : 'Not Connected'}
                  </Text>
                </View>
              }
            />

            <RowSeparator />

            {user.is_spotify_connected ? (
              <SettingsRow
                label="Sync Listening History"
                loading={syncMutation.isPending}
                onPress={syncMutation.isPending ? undefined : handleSyncPress}
                hideChevron
              />
            ) : (
              <SettingsRow
                label="Connect Spotify Account"
                loading={spotifyConnecting}
                onPress={spotifyConnecting ? undefined : handleConnectSpotify}
              />
            )}

            {user.is_spotify_connected && (
              <>
                <RowSeparator />
                <SettingsRow
                  label="Disconnect Spotify"
                  destructive
                  loading={disconnectMutation.isPending}
                  onPress={
                    disconnectMutation.isPending
                      ? undefined
                      : handleDisconnectSpotify
                  }
                />
              </>
            )}
          </Section>
        </View>

        {/* ── About ── */}
        <View>
          <SectionHeader title="About" />
          <Section>
            <SettingsRow label="Version" value={version} />
            <RowSeparator />
            <SettingsRow label="Licenses" disabled />
          </Section>
        </View>

        {/* ── Danger Zone ── */}
        <View>
          <SectionHeader title="Danger Zone" />
          <Section>
            <SettingsRow
              label="Delete Account"
              destructive
              loading={deleteAccountMutation.isPending}
              onPress={
                deleteAccountMutation.isPending
                  ? undefined
                  : handleDeleteAccount
              }
            />
          </Section>
        </View>

        {/* ── Sign Out ── */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderRadius: 16,
            // @ts-ignore
            borderCurve: 'continuous',
            borderWidth: 1.5,
            borderColor: Colors.destructive,
            alignItems: 'center',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: Colors.destructive,
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
