import { use, useState, useRef } from 'react';
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
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

// DRF returns field-level errors as { field: [msg, ...] }. Extract the first
// relevant message so the user sees something actionable instead of "Request failed".
function extractApiError(error: unknown): string {
  if (error instanceof ApiError && error.data) {
    const d = error.data;
    for (const field of ['current_password', 'new_password', 'new_password_confirm', 'non_field_errors']) {
      const msgs = d[field];
      if (Array.isArray(msgs) && msgs.length > 0) return msgs[0] as string;
    }
  }
  return (error as Error).message;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  blurOnSubmit?: boolean;
  hint?: { text: string; color: string } | null;
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
  blurOnSubmit = false,
  hint = null,
}: PasswordFieldProps) {
  return (
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
        {label}
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
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={Colors.textTertiary}
          style={{ fontSize: 15, color: Colors.textPrimary, backgroundColor: 'transparent' }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
        />
      </View>
      {hint && (
        <Text style={{ fontSize: 12, color: hint.color, paddingHorizontal: 4 }}>
          {hint.text}
        </Text>
      )}
    </View>
  );
}

export default function ChangePasswordSheet() {
  const auth = use(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>('/api/v1/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: confirmPassword,
        }),
      }),
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      auth.refreshUser();
      router.back();
    },
  });

  // ── Inline validation hints ───────────────────────────────────────────────

  const sameAsCurrent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === currentPassword;

  const newPasswordHint: PasswordFieldProps['hint'] = sameAsCurrent
    ? { text: 'New password must be different from your current password.', color: Colors.destructive }
    : null;

  const passwordsMatch = newPassword === confirmPassword;
  const confirmPasswordHint: PasswordFieldProps['hint'] =
    confirmPassword.length > 0
      ? passwordsMatch
        ? { text: 'Passwords match.', color: Colors.positive }
        : { text: "Passwords don't match.", color: Colors.destructive }
      : null;

  // ── Save gate ─────────────────────────────────────────────────────────────

  const canSave =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    !sameAsCurrent &&
    !saveMutation.isPending;

  function handleChangeText(setter: (v: string) => void) {
    return (v: string) => {
      if (saveMutation.isError) saveMutation.reset();
      setter(v);
    };
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Change Password', headerLargeTitle: false }} />

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
        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChangeText={handleChangeText(setCurrentPassword)}
          placeholder="Current password"
          returnKeyType="next"
          onSubmitEditing={() => newPasswordRef.current?.focus()}
        />

        <PasswordField
          label="New Password"
          value={newPassword}
          onChangeText={handleChangeText(setNewPassword)}
          placeholder="New password"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          inputRef={newPasswordRef}
          hint={newPasswordHint}
        />

        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={handleChangeText(setConfirmPassword)}
          placeholder="Confirm new password"
          returnKeyType="done"
          blurOnSubmit
          inputRef={confirmPasswordRef}
          hint={confirmPasswordHint}
        />

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
            {extractApiError(saveMutation.error)}
          </Text>
        )}

        <View style={{ gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Change password',
                'Are you sure you want to update your password?',
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
                Update Password
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
