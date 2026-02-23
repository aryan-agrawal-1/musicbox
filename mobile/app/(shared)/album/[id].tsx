import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useAlbum, useAlbumReviews, useUserAlbumRating } from '@/hooks/use-album';
import { StarRating } from '@/components/star-rating';
import { TrackRow } from '@/components/track-row';
import { ReviewCard } from '@/components/review-card';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { formatCount } from '@/lib/format';

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

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data: album, isLoading, error, refetch } = useAlbum(id);
  const { data: reviewsData } = useAlbumReviews(id);
  const { data: userRating } = useUserAlbumRating(id);

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Stack.Screen options={{ title: '' }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <SkeletonCard height={width} borderRadius={0} />
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonCard height={20} borderRadius={4} width="60%" />
            <SkeletonCard height={16} borderRadius={4} width="40%" />
            <View style={{ paddingTop: 12, gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <SkeletonCard key={i} height={48} borderRadius={8} />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error || !album) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Album' }} />
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 12 }}>
          Couldn't load album
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
          title: album.name,
          headerShown: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        {/* ── Hero ── */}
        <View style={{ width, height: width + insets.top, backgroundColor: Colors.surfaceHigh }}>
          <Image
            source={album.image_url ? { uri: album.image_url } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 80,
              // @ts-ignore — experimental_backgroundImage is New Arch / SDK 55
              experimental_backgroundImage:
                'linear-gradient(to top, rgba(11,11,11,1) 0%, rgba(11,11,11,0.7) 40%, transparent 100%)',
            }}
          >
            <Text
              style={{ fontSize: 28, fontWeight: '700', color: Colors.textPrimary }}
              numberOfLines={2}
            >
              {album.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              {album.artists.map((artist, i) => (
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
              <Text style={{ fontSize: 15, color: Colors.textTertiary }}>
                {' '}· {album.release_date?.slice(0, 4)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Rating Summary ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <StarRating value={album.avg_rating ?? 0} size={22} />
          <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
            {album.avg_rating != null
              ? `${album.avg_rating.toFixed(1)} · `
              : ''}
            {formatCount(album.total_ratings)} ratings
          </Text>
        </View>

        <Separator />

        {/* ── Tracklist ── */}
        {(album.songs ?? []).length > 0 && (
          <View style={{ paddingTop: 8 }}>
            <SectionHeader title="Tracks" />
            <View>
              {(album.songs ?? []).map((song, i) => (
                <View key={song.spotify_id}>
                  <TrackRow
                    track={song}
                    showTrackNumber
                    showAlbumArt={false}
                    onPress={() => router.push(`/track/${song.spotify_id}`)}
                  />
                  {i < (album.songs?.length ?? 0) - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: Colors.separator,
                        marginLeft: 56,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Community Reviews ── */}
        {reviews.length > 0 && (
          <>
            <Separator />
            <View style={{ paddingTop: 8 }}>
              <SectionHeader title="Reviews" />
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
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
                params: { albumId: id, type: 'album' },
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
                Rate this Album
              </Text>
            )}
          </Pressable>
        </GlassView>
      </Animated.View>
    </>
  );
}
