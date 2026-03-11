import { use, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, withSpring, withTiming, withSequence, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '@/contexts/auth-context';
import { apiFetch } from '@/lib/api';
import { Colors } from '@/constants/colors';

const SPOTIFY_GREEN = '#1DB954';

interface SpotifyPetitionSheetProps {
  onClose: () => void;
  onSigned?: () => void;
}

export function SpotifyPetitionSheet({ onClose, onSigned }: SpotifyPetitionSheetProps) {
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);

  const alreadySigned = auth.user?.spotify_petition_signed ?? false;
  const [signed, setSigned] = useState(alreadySigned);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  async function handleSign() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ spotify_petition_signed: true }),
      });
      await auth.refreshUser();
      setSigned(true);
      checkScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withTiming(1, { duration: 150 }),
      );
      onSigned?.();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: insets.bottom + 32,
      }}
    >
      {/* Icon */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ alignItems: 'center', marginBottom: 28 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: SPOTIFY_GREEN,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source="sf:music.note"
            style={{ width: 36, height: 36 }}
            tintColor="#FFFFFF"
            contentFit="contain"
          />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        entering={FadeInDown.delay(100).duration(400)}
        style={{
          fontSize: 26,
          fontWeight: '700',
          color: Colors.textPrimary,
          textAlign: 'center',
          letterSpacing: -0.5,
          marginBottom: 14,
        }}
      >
        We wish we had{'\n'}Spotify too.
      </Animated.Text>

      {/* Body */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <Text
          style={{
            fontSize: 15,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 10,
          }}
        >
          Spotify restricts API access to developers until their app reaches{' '}
          <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>
            250,000 monthly active users
          </Text>
          {' '}— what they call "extended quota mode."
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          Until then, only a tiny number of allowlisted accounts can connect. Sign below to tell
          Spotify there's real demand — every voice counts.
        </Text>
      </Animated.View>

      {/* Divider */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={{
          height: 1,
          backgroundColor: Colors.separator,
          marginVertical: 28,
        }}
      />

      {/* Petition card */}
      <Animated.View
        entering={FadeInDown.delay(250).duration(400)}
        style={{
          backgroundColor: Colors.surfaceElevated,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 20,
          gap: 14,
          marginBottom: 28,
          borderWidth: 1,
          borderColor: signed ? `${SPOTIFY_GREEN}33` : Colors.separator,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: Colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Community Petition
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: Colors.textPrimary,
            lineHeight: 21,
            fontWeight: '500',
          }}
        >
          "I want my Spotify connected to Noted. Spotify, please let the devs cook so we can rate and review the music we actually listen to."
        </Text>

        {error && (
          <Text style={{ fontSize: 13, color: Colors.destructive }}>{error}</Text>
        )}

        {signed ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: `${SPOTIFY_GREEN}18`,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Animated.View style={checkStyle}>
              <Image
                source="sf:checkmark.circle.fill"
                style={{ width: 22, height: 22 }}
                tintColor={SPOTIFY_GREEN}
                contentFit="contain"
              />
            </Animated.View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: SPOTIFY_GREEN }}>
              Signed — thank you!
            </Text>
          </Animated.View>
        ) : (
          <Pressable
            onPress={handleSign}
            disabled={isLoading}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: SPOTIFY_GREEN,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: pressed || isLoading ? 0.75 : 1,
            })}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  Sign the petition
                </Text>
              </>
            )}
          </Pressable>
        )}
      </Animated.View>

      {/* Close */}
      <Pressable
        onPress={onClose}
        hitSlop={12}
        style={{ alignItems: 'center', paddingVertical: 8 }}
      >
        <Text style={{ fontSize: 15, color: Colors.textTertiary }}>
          {signed ? 'Done' : 'Close'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
