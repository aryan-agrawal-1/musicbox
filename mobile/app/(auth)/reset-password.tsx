import { use, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { extractApiError } from '@/lib/extract-api-error';
import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';

function paramString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

function LabeledPasswordInput({
  label,
  value,
  onChangeText,
  inputRef,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
}) {
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
          // @ts-ignore iOS borderCurve
          borderCurve: 'continuous',
          backgroundColor: Colors.surfaceElevated,
          padding: 14,
        }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={Colors.textTertiary}
          style={{ fontSize: 15, color: Colors.textPrimary, backgroundColor: 'transparent' }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
      </View>
    </View>
  );
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string; token?: string }>();
  const auth = use(AuthContext);

  const uid = paramString(params.uid);
  const token = paramString(params.token);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const confirmRef = useRef<TextInput>(null);

  const linkValid = Boolean(uid && token);

  const passwordsMatch = password.length > 0 && password === confirm;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ detail: string }>('/api/v1/auth/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({
          uid,
          token,
          new_password: password,
          new_password_confirm: confirm,
        }),
      }),
    onSuccess: async () => {
      await auth.logout();
      router.replace({ pathname: '/(auth)/login', params: { passwordReset: 'success' } });
    },
  });

  const canSubmit =
    linkValid && passwordsMatch && password.length > 0 && !mutation.isPending;

  const errorMessage = useMemo(() => {
    if (!mutation.isError) return null;
    return extractApiError(mutation.error, [
      'detail',
      'token',
      'new_password',
      'new_password_confirm',
      'non_field_errors',
    ]);
  }, [mutation.isError, mutation.error]);

  if (!linkValid) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerShadowVisible: false,
            title: '',
            headerTintColor: Colors.textPrimary,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.background,
            paddingHorizontal: 20,
            paddingTop: 24,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 17, color: Colors.textPrimary, marginBottom: 16 }}>
            This reset link is invalid or incomplete. Request a new link from the sign-in screen.
          </Text>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Text style={{ fontSize: 16, color: Colors.accent, fontWeight: '600' }}>Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          title: '',
          headerTintColor: Colors.textPrimary,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          gap: 20,
        }}
      >
        <Text
          style={{
            fontSize: 34,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          New password
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: 22 }}>
          Choose a strong password for your account.
        </Text>

        <LabeledPasswordInput
          label="New password"
          value={password}
          onChangeText={(t) => {
            if (mutation.isError) mutation.reset();
            setPassword(t);
          }}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />

        <LabeledPasswordInput
          label="Confirm password"
          value={confirm}
          onChangeText={(t) => {
            if (mutation.isError) mutation.reset();
            setConfirm(t);
          }}
          inputRef={confirmRef}
          returnKeyType="done"
        />

        {confirm.length > 0 ? (
          <Text
            style={{
              fontSize: 13,
              color: passwordsMatch ? Colors.positive : Colors.destructive,
            }}
          >
            {passwordsMatch ? 'Passwords match.' : "Passwords don't match."}
          </Text>
        ) : null}

        {errorMessage ? (
          <Text style={{ fontSize: 14, color: Colors.destructive, lineHeight: 20 }} selectable>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
          style={{
            height: 52,
            borderRadius: 14,
            // @ts-ignore iOS borderCurve
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canSubmit ? 0.5 : 1,
          }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Update password</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
