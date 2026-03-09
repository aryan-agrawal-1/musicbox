import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch } from '@/lib/api';
import { onboardingStore } from '@/lib/onboarding-store';
import { Colors } from '@/constants/colors';
import { StarRating, getRatingLabel } from '@/components/star-rating';
import type { Artist } from '@/types/api';

export default function RateSongSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    songId: string;
    name: string;
    artists: string;
    albumName: string;
    albumImage: string;
  }>();

  const songId = parseInt(params.songId ?? '0', 10);
  const songName = params.name ?? '';
  const albumName = params.albumName ?? '';
  const albumImage = params.albumImage || null;
  const artists: Artist[] = (() => {
    try {
      return JSON.parse(params.artists ?? '[]') as Artist[];
    } catch {
      return [];
    }
  })();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleSkip() {
    router.back();
  }

  async function handleSave() {
    if (rating === 0 || isSaving) return;
    setIsSaving(true);

    // Notify parent immediately so the card updates without waiting for network
    onboardingStore.fireRating(songId, rating);
    router.back();

    // Fire-and-forget API calls
    try {
      const ratingRes = await apiFetch<{ id: number }>('/api/v1/reviews/songs/ratings/', {
        method: 'POST',
        body: JSON.stringify({ song: songId, rating }),
      });
      if (reviewText.trim().length > 0) {
        await apiFetch('/api/v1/reviews/songs/reviews/', {
          method: 'POST',
          body: JSON.stringify({
            song: songId,
            rating: ratingRes.id,
            content: reviewText.trim(),
          }),
        });
      }
    } catch {
      // fire-and-forget — same pattern as existing onboarding ratings
    }
  }

  const ratingLabel = getRatingLabel(rating);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: insets.bottom + 32,
        gap: 28,
      }}
    >
      {/* Song header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 10,
            borderCurve: 'continuous',
            backgroundColor: Colors.surfaceHigh,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {albumImage ? (
            <Image
              source={{ uri: albumImage }}
              style={{ width: 72, height: 72 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28 }}>♪</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            style={{ fontSize: 17, fontWeight: '600', color: Colors.textPrimary }}
            numberOfLines={2}
          >
            {songName}
          </Text>
          <Text
            style={{ fontSize: 14, color: Colors.textSecondary }}
            numberOfLines={1}
          >
            {artists.map(a => a.name).join(', ')}
          </Text>
          <Text
            style={{ fontSize: 13, color: Colors.textTertiary }}
            numberOfLines={1}
          >
            {albumName}
          </Text>
        </View>
      </View>

      {/* Star rating */}
      <View style={{ alignItems: 'center', gap: 12 }}>
        <StarRating value={rating} onChange={setRating} size={38} />
        <Text
          style={{
            fontSize: 14,
            color: rating === 0 ? Colors.textTertiary : Colors.accent,
            fontWeight: '500',
          }}
        >
          {rating > 0 ? `${rating} · ${ratingLabel}` : ratingLabel}
        </Text>
      </View>

      {/* Review text input */}
      <View
        style={{
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: Colors.surfaceElevated,
          padding: 14,
          minHeight: 96,
        }}
      >
        <TextInput
          style={{
            fontSize: 15,
            color: Colors.textPrimary,
            flex: 1,
            minHeight: 68,
            backgroundColor: 'transparent',
          }}
          placeholder="Write a review… (optional)"
          placeholderTextColor={Colors.textTertiary}
          multiline
          textAlignVertical="top"
          value={reviewText}
          onChangeText={setReviewText}
        />
      </View>

      {/* Actions */}
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={handleSave}
          disabled={rating === 0 || isSaving}
          style={{
            height: 52,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: rating === 0 ? 0.35 : 1,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
            Save Rating
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 15, color: Colors.textTertiary }}>Skip</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
