import { use } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '@/contexts/auth-context';
import { sharePreviewStore } from '@/lib/share-preview-store';
import { useSharePrompt } from '@/hooks/use-share-prompt';

import { Colors } from '@/constants/colors';
import {
  useTrack,
  useSongReviews,
  useUserSongRating,
  useUserSongReview,
} from '@/hooks/use-track';
import { StarRating } from '@/components/star-rating';
import { ReviewCard } from '@/components/review-card';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { HeroBackButton } from '@/components/hero-back-button';
import { formatCount, formatDuration } from '@/lib/format';

function Separator() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: Colors.separator,
        marginHorizontal: 16,
        marginVertical: 8,
      }}
    />
  );
}

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = use(AuthContext);
  const { data: track, isLoading, error, refetch } = useTrack(id);
  const { data: reviewsData } = useSongReviews(id);
  const { data: userRating } = useUserSongRating(id);
  const { data: userReview } = useUserSongReview(id);

  const {
    sharePrompt,
    shareReviewText,
    fillStyle,
    hasStartedPromptFillRef,
    resetFill,
    startPromptAnimation,
  } = useSharePrompt(id, 'track');

  function handleRateButtonPress() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (sharePrompt) {
      resetFill();
      openShareSheet();
      return;
    }
    router.push({ pathname: '/rate', params: { trackId: id, type: 'track' } });
  }

  function openShareSheet() {
    if (!track || !userRating || !user) return;

    const shareId = sharePreviewStore.set({
      variant: 'review',
      data: {
        songOrAlbumName: track.name,
        artistName: track.artists?.[0]?.name ?? '',
        albumImage: track.album_image,
        ratingValue: userRating.rating,
        reviewText: shareReviewText ?? userReview?.content ?? '',
        username: user.username,
        avatarUrl: user.avatar_url,
        type: 'song',
      },
    });

    router.push({ pathname: '/share-preview', params: { shareId } });
  }

  const artSize = 240;

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={{ height: width * 0.85, alignItems: 'center', justifyContent: 'center' }}>
            <SkeletonCard height={artSize} width={artSize} borderRadius={16} />
          </View>
          <View style={{ padding: 16, gap: 12, alignItems: 'center' }}>
            <SkeletonCard height={24} borderRadius={4} width="55%" />
            <SkeletonCard height={16} borderRadius={4} width="40%" />
            <View style={{ paddingTop: 16, width: '100%', gap: 12 }}>
              <SkeletonCard height={44} borderRadius={8} />
              <SkeletonCard height={100} borderRadius={12} />
            </View>
          </View>
        </ScrollView>
        <HeroBackButton />
      </View>
    );
  }

  // Error state
  if (error || !track) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Track' }} />
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 12 }}>
          Couldn't load track
        </Text>
        <Pressable onPress={() => refetch()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.accent }}>Tap to retry</Text>
        </Pressable>
      </View>
    );
  }

  const reviews = reviewsData?.results ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: track.name,
          headerShown: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        {/* ── Blurred Hero ── */}
        <View style={{ width, height: width * 0.85 + insets.top, backgroundColor: Colors.surfaceHigh }}>
          {/* Background album art — blurred */}
          {track.album_image && (
            <Image
              source={{ uri: track.album_image }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              blurRadius={60}
            />
          )}
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(11, 11, 11, 0.55)',
            }}
          />

          {/* Bottom gradient fade */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              // @ts-ignore — experimental_backgroundImage is New Arch / SDK 55
              experimental_backgroundImage:
                'linear-gradient(to top, rgba(11,11,11,1) 0%, transparent 100%)',
            }}
          />

          {/* Centered album art */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: insets.top,
            }}
          >
            <Animated.View entering={FadeInDown.duration(500).springify()}>
              <View
                style={{
                  width: artSize,
                  height: artSize,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
                }}
              >
                <Image
                  source={track.album_image ? { uri: track.album_image } : undefined}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
            </Animated.View>
          </View>

          <HeroBackButton />
        </View>

        {/* ── Track Info ── */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, gap: 6 }}
        >
          <Text
            style={{ fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' }}
            numberOfLines={2}
            selectable
          >
            {track.name}
          </Text>

          {/* Artists */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {track.artists.map((artist, i) => (
              <View key={artist.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 && (
                  <Text style={{ fontSize: 15, color: Colors.textSecondary }}>, </Text>
                )}
                <Link href={`/artist/${artist.id}`} asChild>
                  <Pressable hitSlop={4}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.textSecondary }}>
                      {artist.name}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>

          {/* Album link + metadata row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Link href={`/album/${track.album_id}`} asChild>
              <Pressable hitSlop={4}>
                <Text style={{ fontSize: 13, color: Colors.textTertiary }} numberOfLines={1}>
                  {track.album_name}
                </Text>
              </Pressable>
            </Link>
            <Text style={{ fontSize: 13, color: Colors.textTertiary }}>·</Text>
            <View
              style={{
                backgroundColor: Colors.surfaceElevated,
                borderRadius: 100,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: Colors.textTertiary, fontVariant: ['tabular-nums'] }}>
                {formatDuration(track.duration_ms)}
              </Text>
            </View>
            {track.explicit && (
              <View
                style={{
                  backgroundColor: Colors.surfaceElevated,
                  borderRadius: 4,
                  borderCurve: 'continuous',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textTertiary }}>
                  E
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Separator />

        {/* ── Rating Summary ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <StarRating value={track.avg_rating ?? 0} size={22} />
          <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
            {track.avg_rating != null
                ? `${track.avg_rating.toFixed(1)} · `
                : ''}
              {formatCount(track.total_ratings)} ratings
          </Text>
        </View>

        {/* ── Community Reviews ── */}
        {reviews.length > 0 && (
          <>
            <Separator />
            <View style={{ paddingTop: 8 }}>
              <SectionHeader title="Reviews" />
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} type="song" />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Floating Rate Button ── */}
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          left: 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <GlassView isInteractive style={{ borderRadius: 50, overflow: 'hidden' }}>
          <Pressable
            onPress={handleRateButtonPress}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;
              if (sharePrompt && !hasStartedPromptFillRef.current && nextWidth > 0) {
                hasStartedPromptFillRef.current = true;
                startPromptAnimation(nextWidth);
              }
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 24,
              paddingVertical: 14,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {sharePrompt ? (
              <>
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      backgroundColor: Colors.accent,
                    },
                    fillStyle,
                  ]}
                />
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary, zIndex: 1 }}>
                  Share your review
                </Text>
              </>
            ) : userRating ? (
              <Animated.View entering={FadeIn.duration(260)}>
                <StarRating value={userRating.rating} size={18} />
              </Animated.View>
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>
                Rate this Track
              </Text>
            )}
          </Pressable>
        </GlassView>

        {userRating && !sharePrompt && (
          <Animated.View
            entering={ZoomIn.duration(280)}
            exiting={ZoomOut.duration(240)}
          >
            <GlassView isInteractive style={{ borderRadius: 30, overflow: 'hidden' }}>
              <Pressable
                onPress={() => {
                  if (process.env.EXPO_OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  resetFill();
                  openShareSheet();
                }}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Image
                  source="sf:square.and.arrow.up"
                  style={{ width: 20, height: 20 }}
                  tintColor={Colors.textPrimary}
                />
              </Pressable>
            </GlassView>
          </Animated.View>
        )}
      </Animated.View>

    </>
  );
}
