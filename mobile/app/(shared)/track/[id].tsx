import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useTrack, useSongReviews, useUserSongRating } from '@/hooks/use-track';
import { StarRating } from '@/components/star-rating';
import { ReviewCard } from '@/components/review-card';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
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
  const { data: track, isLoading, error, refetch } = useTrack(id);
  const { data: reviewsData } = useSongReviews(id);
  const { data: userRating } = useUserSongRating(id);

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
              <View key={artist.spotify_id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 && (
                  <Text style={{ fontSize: 15, color: Colors.textSecondary }}>, </Text>
                )}
                <Link href={`/artist/${artist.spotify_id}`} asChild>
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
            <Link href={`/album/${track.album_spotify_id}`} asChild>
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
          alignItems: 'center',
        }}
      >
        <GlassView isInteractive style={{ borderRadius: 50, overflow: 'hidden' }}>
          <Pressable
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push({
                pathname: '/rate',
                params: { trackId: id, type: 'track' },
              });
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
            {userRating ? (
              <StarRating value={userRating.rating} size={18} />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>
                Rate this Track
              </Text>
            )}
          </Pressable>
        </GlassView>
      </Animated.View>
    </>
  );
}
