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

export default function ChangeEmailSheet() {
  const auth = use(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.user!;

  const [email, setEmail] = useState(user.email);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<User>('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ email: email.trim() }),
      }),
    onSuccess: () => {
      auth.refreshUser();
      router.back();
    },
  });

  const hasChanged = email.trim() !== user.email;
  const canSave = hasChanged && !saveMutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Change Email', headerLargeTitle: false }} />

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
            Email Address
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
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.textTertiary}
              style={{ fontSize: 15, color: Colors.textPrimary, backgroundColor: 'transparent' }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
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
                'Change email',
                `Change your email to "${email.trim()}"?`,
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
                Save Email
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
