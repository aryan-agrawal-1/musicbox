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

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { apiFetch } from '@/lib/api';
import type { User } from '@/types/api';

export default function EditProfileSheet() {
  const auth = use(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.user!;

  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [bio, setBio] = useState(user.bio ?? '');

  const lastNameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<User>('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim() || null,
        }),
      }),
    onSuccess: () => {
      auth.refreshUser();
      router.back();
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile', headerLargeTitle: false }} />

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
        {/* First Name */}
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
            First Name
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
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={Colors.textTertiary}
              style={{ fontSize: 15, color: Colors.textPrimary, backgroundColor: 'transparent' }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Last Name */}
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
            Last Name
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
              ref={lastNameRef}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={Colors.textTertiary}
              style={{ fontSize: 15, color: Colors.textPrimary, backgroundColor: 'transparent' }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => bioRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Bio */}
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
            Bio
          </Text>
          <View
            style={{
              borderRadius: 12,
              // @ts-ignore
              borderCurve: 'continuous',
              backgroundColor: Colors.surfaceElevated,
              padding: 14,
              minHeight: 96,
              gap: 6,
            }}
          >
            <TextInput
              ref={bioRef}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself…"
              placeholderTextColor={Colors.textTertiary}
              style={{
                fontSize: 15,
                color: Colors.textPrimary,
                backgroundColor: 'transparent',
                minHeight: 68,
                textAlignVertical: 'top',
              }}
              multiline
              returnKeyType="default"
              maxLength={200}
            />
            {bio.length > 150 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textTertiary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {bio.length}/200
                </Text>
              </View>
            )}
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

        {/* Save CTA */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Save changes',
                'Are you sure you want to update your profile?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Save', onPress: () => saveMutation.mutate() },
                ]
              )
            }
            disabled={saveMutation.isPending}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 14,
              // @ts-ignore
              borderCurve: 'continuous',
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saveMutation.isPending ? 0.35 : pressed ? 0.85 : 1,
            })}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
                Save Changes
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
