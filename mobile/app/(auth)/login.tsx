import { use, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '@/contexts/auth-context';
import { ApiError } from '@/lib/api';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const emailBorder = useSharedValue(0);
  const passwordBorder = useSharedValue(0);

  const emailBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      emailBorder.value,
      [0, 1],
      [Colors.separator, Colors.accent]
    ),
  }));

  const passwordBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      passwordBorder.value,
      [0, 1],
      [Colors.separator, Colors.accent]
    ),
  }));

  const { mutate: doLogin, isPending, error } = useMutation({
    mutationFn: () => auth.login(identifier, password),
  });

  const errorMessage =
    error instanceof ApiError && (error.status === 400 || error.status === 401)
      ? 'Email or password is incorrect'
      : error instanceof ApiError
      ? error.message
      : error
      ? 'Something went wrong'
      : null;

  const canSubmit = identifier.length > 0 && password.length > 0;

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
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          title: 'Welcome back',
          headerTitleStyle: { color: Colors.textPrimary },
          headerLargeTitleStyle: { color: Colors.textPrimary },
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 40 }}
      >
        <View style={{ gap: 16, marginTop: 8 }}>
          {/* Email / username field */}
          <Animated.View
            style={[
              { borderBottomWidth: 1, paddingBottom: 2 },
              emailBorderStyle,
            ]}
          >
            <TextInput
              style={{ fontSize: 17, color: Colors.textPrimary, paddingVertical: 12, backgroundColor: Colors.background }}
              placeholder="Email or username"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              value={identifier}
              onChangeText={setIdentifier}
              onFocus={() => { emailBorder.value = withTiming(1, { duration: 200 }); }}
              onBlur={() => { emailBorder.value = withTiming(0, { duration: 200 }); }}
            />
          </Animated.View>

          {/* Password field */}
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
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => { if (canSubmit) doLogin(); }}
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

          {/* Forgot password */}
          <Pressable hitSlop={8} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Forgot password?</Text>
          </Pressable>

          {/* Error */}
          {errorMessage && (
            <Text style={{ fontSize: 13, color: Colors.destructive, lineHeight: 18 }}>
              {errorMessage}
            </Text>
          )}

          {/* Submit button */}
          <Pressable
            onPress={() => doLogin()}
            disabled={isPending || !canSubmit}
            style={{
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
              opacity: isPending || !canSubmit ? 0.5 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
                Sign in
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
