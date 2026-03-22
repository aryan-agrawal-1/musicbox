import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { apiFetch, ApiError } from '@/lib/api';
import { extractApiError } from '@/lib/extract-api-error';
import { Colors } from '@/constants/colors';

const GENERIC_SUCCESS =
  'If an account exists for this email, you will receive a password reset link shortly.';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const border = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      border.value,
      [0, 1],
      [Colors.separator, Colors.accent]
    ),
  }));

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ detail: string }>('/api/v1/auth/password-reset/request/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }),
    onSuccess: () => setDone(true),
  });

  const errorMessage =
    mutation.error instanceof ApiError
      ? extractApiError(mutation.error, ['email', 'non_field_errors', 'detail'])
      : mutation.error
      ? 'Something went wrong'
      : null;

  const canSubmit = email.trim().length > 0 && !mutation.isPending;

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
        }}
      >
        <Text
          style={{
            fontSize: 34,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 12,
          }}
        >
          Reset password
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 }}>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </Text>

        {done ? (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 16, color: Colors.textPrimary, lineHeight: 24 }}>{GENERIC_SUCCESS}</Text>
            <Pressable
              onPress={() => router.back()}
              style={{
                height: 52,
                borderRadius: 14,
                // @ts-ignore iOS borderCurve
                borderCurve: 'continuous',
                backgroundColor: Colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Animated.View style={[{ borderBottomWidth: 1, paddingBottom: 2 }, borderStyle]}>
              <TextInput
                style={{
                  fontSize: 17,
                  color: Colors.textPrimary,
                  paddingVertical: 12,
                  backgroundColor: Colors.background,
                }}
                placeholder="Email"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => {
                  border.value = withTiming(1, { duration: 200 });
                }}
                onBlur={() => {
                  border.value = withTiming(0, { duration: 200 });
                }}
              />
            </Animated.View>

            {errorMessage ? (
              <Text style={{ fontSize: 13, color: Colors.destructive, lineHeight: 18 }}>{errorMessage}</Text>
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
                marginTop: 4,
                opacity: !canSubmit ? 0.5 : 1,
              }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>Send reset link</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
