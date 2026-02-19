import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch } from '@/lib/api';
import { onboardingStore } from '@/lib/onboarding-store';
import { Colors } from '@/constants/colors';
import type { Artist } from '@/types/api';

// ---------------------------------------------------------------------------
// Half-star row
// ---------------------------------------------------------------------------

interface HalfStarRowProps {
  value: number;
  onChange: (v: number) => void;
}

// Star dimensions must match to make the drag calculation correct
const STAR_WIDTH = 44;
const STAR_GAP = 6;

function computeStarRating(x: number): number {
  const slotWidth = STAR_WIDTH + STAR_GAP; // 50px per star slot
  const totalWidth = 5 * STAR_WIDTH + 4 * STAR_GAP; // 244px
  const clamped = Math.max(0, Math.min(x, totalWidth));
  const slotIndex = Math.min(4, Math.floor(clamped / slotWidth));
  const posInSlot = clamped - slotIndex * slotWidth;
  // In the gap between stars → count as the full star just passed
  if (posInSlot >= STAR_WIDTH) return slotIndex + 1;
  // Left half → n.5, right half → n
  return posInSlot < STAR_WIDTH / 2 ? slotIndex + 0.5 : slotIndex + 1;
}

function HalfStarRow({ value, onChange }: HalfStarRowProps) {
  const lastRating = useRef(value);
  const rowRef = useRef<View>(null);
  const rowPageX = useRef(0);

  function measureRow() {
    rowRef.current?.measure((_x, _y, _w, _h, pageX) => {
      rowPageX.current = pageX;
    });
  }

  function handleTouch(pageX: number) {
    const x = pageX - rowPageX.current;
    const next = computeStarRating(x);
    if (next !== lastRating.current) {
      lastRating.current = next;
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange(next);
    }
  }

  return (
    <View
      ref={rowRef}
      onLayout={measureRow}
      style={{ flexDirection: 'row', gap: STAR_GAP }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={e => {
        measureRow();
        handleTouch(e.nativeEvent.pageX);
      }}
      onResponderMove={e => handleTouch(e.nativeEvent.pageX)}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return (
          <View key={star} style={{ width: STAR_WIDTH, height: STAR_WIDTH }}>
            {/* Background empty star */}
            <Text
              style={{
                fontSize: 38,
                position: 'absolute',
                color: 'rgba(255, 255, 255, 0.18)',
                lineHeight: STAR_WIDTH,
              }}
            >
              ★
            </Text>
            {/* Foreground star clipped to fill fraction */}
            {fill > 0 && (
              <View style={{ position: 'absolute', width: STAR_WIDTH * fill, overflow: 'hidden' }}>
                <Text style={{ fontSize: 38, color: Colors.accent, lineHeight: STAR_WIDTH }}>★</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rate-song sheet
// ---------------------------------------------------------------------------

export default function RateSongSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    spotifyId: string;
    songId: string;
    name: string;
    artists: string;
    albumName: string;
    albumImage: string;
  }>();

  const spotifyId = params.spotifyId ?? '';
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
    onboardingStore.fireRating(spotifyId, songId, rating);
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

  const ratingLabel =
    rating === 0
      ? 'Tap to rate'
      : rating === 5
        ? 'Masterpiece'
        : rating >= 4.5
          ? 'Exceptional'
          : rating >= 4
            ? 'Great'
            : rating >= 3.5
              ? 'Good'
              : rating >= 3
                ? 'Decent'
                : rating >= 2
                  ? 'Not great'
                  : 'Poor';

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
        <HalfStarRow value={rating} onChange={setRating} />
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
