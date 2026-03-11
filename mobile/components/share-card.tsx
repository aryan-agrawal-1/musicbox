import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import type { ReviewShareData, OnboardingTrackData } from '@/types/share';

// ─── ReviewShareCard ──────────────────────────────────────────────────────────

export const REVIEW_CARD_WIDTH = 380;
export const REVIEW_CARD_HEIGHT = 520;

interface ReviewShareCardProps {
  data: ReviewShareData;
  onImageLoad?: () => void;
}

export const ReviewShareCard = forwardRef<View, ReviewShareCardProps>(
  function ReviewShareCard({ data, onImageLoad }, ref) {
    return (
      <View
        ref={ref}
        style={{
          width: REVIEW_CARD_WIDTH,
          height: REVIEW_CARD_HEIGHT,
          backgroundColor: '#0a0a0a',
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        {/* Blurred background art */}
        {data.albumImage ? (
          <>
            <Image
              source={{ uri: data.albumImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onLoad={onImageLoad}
            />
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
        )}

        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.78)', 'rgba(10,10,10,0.96)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Content */}
        <View style={{ flex: 1, padding: 28, justifyContent: 'flex-end' }}>
          {/* Album art */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {data.albumImage ? (
              <Image
                source={{ uri: data.albumImage }}
                style={{ width: 160, height: 160, borderRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: 160, height: 160, borderRadius: 16, backgroundColor: Colors.surfaceHigh }} />
            )}
          </View>

          {/* Title + subtitle */}
          <Text
            style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.3 }}
            numberOfLines={2}
          >
            {data.songOrAlbumName}
          </Text>
          {data.artistName ? (
            <Text
              style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }}
              numberOfLines={1}
            >
              {data.artistName}
            </Text>
          ) : null}

          {/* Stars */}
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <StarRating value={data.ratingValue} size={22} />
          </View>

          {/* Review text */}
          {data.reviewText.trim().length > 0 ? (
            <Text
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: 14,
                lineHeight: 19,
                marginBottom: 32,
              }}
              numberOfLines={6}
            >
              "{data.reviewText.trim()}"
            </Text>
          ) : null}


          {/* User row + wordmark */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AvatarImage uri={data.avatarUrl} size={26} displayName={data.username} />
              <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: '500' }}>
                @{data.username}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: -0.2 }}>
              noted
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

// ─── OnboardingShareCard ──────────────────────────────────────────────────────

export const ONBOARDING_CARD_SIZE = 400;

// Adaptive row layouts: each entry is a list of track indices per row.
// 1 → full card | 2 → two columns | 3 → full top + 2 below
// 4 → 2×2       | 5 → 3 top + 2 below
function getRows(count: number): number[][] {
  switch (count) {
    case 1: return [[0]];
    case 2: return [[0, 1]];
    case 3: return [[0], [1, 2]];
    case 4: return [[0, 1], [2, 3]];
    case 5: return [[0, 1, 2], [3, 4]];
    default: return [[0]];
  }
}

function TileRatingBadge({ rating }: { rating: number }) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return (
    <View style={{ borderRadius: 100, overflow: 'hidden' }}>
      <BlurView intensity={90} tint="dark" style={{ paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.accent,
            fontVariant: ['tabular-nums'],
          }}
        >
          {rating.toFixed(1)} ★
        </Text>
      </BlurView>
    </View>
  );
}

interface OnboardingShareCardProps {
  tracks: OnboardingTrackData[];
  onImageLoad?: () => void;
}

export const OnboardingShareCard = forwardRef<View, OnboardingShareCardProps>(
  function OnboardingShareCard({ tracks, onImageLoad }, ref) {
    const n = Math.min(tracks.length, 5);
    const rows = getRows(n).map(indices => indices.map(i => tracks[i] ?? null));
    const rowHeight = ONBOARDING_CARD_SIZE / rows.length;

    return (
      <View
        ref={ref}
        style={{ width: ONBOARDING_CARD_SIZE, height: ONBOARDING_CARD_SIZE, backgroundColor: Colors.background, borderRadius: 24, overflow: 'hidden' }}
      >
        <View style={{ flex: 1 }}>
          {rows.map((row, rowIdx) => {
            const tileWidth = ONBOARDING_CARD_SIZE / row.length;
            return (
              <View key={rowIdx} style={{ flexDirection: 'row', height: rowHeight }}>
                {row.map((track, colIdx) => (
                  <View key={colIdx} style={{ width: tileWidth, height: rowHeight, backgroundColor: Colors.surface }}>
                    {track?.albumImage ? (
                      <Image
                        source={{ uri: track.albumImage }}
                        style={{ width: tileWidth, height: rowHeight }}
                        contentFit="cover"
                        onLoad={rowIdx === 0 && colIdx === 0 ? onImageLoad : undefined}
                      />
                    ) : null}
                    {track ? (
                      <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
                        <TileRatingBadge rating={track.rating} />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* Bottom overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,10,0.92)']}
          locations={[0.35, 1]}
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 20 }]}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 }}>
            My first ratings
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
              Rated {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: -0.2 }}>
              noted
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);
