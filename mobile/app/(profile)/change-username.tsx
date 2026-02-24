import { use, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { apiFetch } from '@/lib/api';
import type { User } from '@/types/api';

const USERNAME_COOLDOWN_DAYS = 30;

function getCooldownInfo(usernameLastChanged: string | null): {
  locked: boolean;
  nextAllowedDate: Date | null;
} {
  if (!usernameLastChanged) return { locked: false, nextAllowedDate: null };
  const lastChanged = new Date(usernameLastChanged);
  const nextAllowed = new Date(lastChanged.getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  if (Date.now() < nextAllowed.getTime()) {
    return { locked: true, nextAllowedDate: nextAllowed };
  }
  return { locked: false, nextAllowedDate: null };
}

export default function ChangeUsernameSheet() {
  const auth = use(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.user!;

  const [username, setUsername] = useState(user.username);

  const { locked, nextAllowedDate } = getCooldownInfo(user.username_last_changed);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<User>('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() }),
      }),
    onSuccess: () => {
      auth.refreshUser();
      router.back();
    },
  });

  const hasChanged = username.trim() !== user.username;
  const canSave = hasChanged && !locked && !saveMutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Change Username', headerLargeTitle: false }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
      >
        {locked && nextAllowedDate && (
          <View
            style={{
              backgroundColor: Colors.surfaceElevated,
              borderRadius: 12,
              // @ts-ignore
              borderCurve: 'continuous',
              padding: 14,
              gap: 4,
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }}
            >
              Username change locked
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }}>
              You can change your username again on{' '}
              {nextAllowedDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              .
            </Text>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              paddingHorizontal: 4,
            }}
          >
            Username
          </Text>
          <View
            style={{
              borderRadius: 12,
              // @ts-ignore
              borderCurve: 'continuous',
              backgroundColor: Colors.surfaceElevated,
              padding: 14,
            }}
          >
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={Colors.textTertiary}
              style={{
                fontSize: 15,
                color: locked ? Colors.textTertiary : Colors.textPrimary,
                backgroundColor: 'transparent',
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!locked}
            />
          </View>
          <Text style={{ fontSize: 12, color: Colors.textTertiary, paddingHorizontal: 4 }}>
            Usernames can only be changed once every {USERNAME_COOLDOWN_DAYS} days.
          </Text>
        </View>

        {saveMutation.isError && (
          <Text
            style={{
              fontSize: 14,
              color: Colors.destructive,
              textAlign: 'center',
              paddingHorizontal: 4,
            }}
            selectable
          >
            {(saveMutation.error as Error).message}
          </Text>
        )}

        <View style={{ gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Change username',
                `Change your username to "@${username.trim()}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Change', onPress: () => saveMutation.mutate() },
                ],
              )
            }
            disabled={!canSave}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 14,
              // @ts-ignore
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !canSave ? 0.35 : pressed ? 0.85 : 1,
            })}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
                Save Username
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, color: Colors.textTertiary }}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
