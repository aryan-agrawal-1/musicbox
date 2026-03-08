import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { AlbumCard } from '@/components/album-card';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { HeroBackButton } from '@/components/hero-back-button';
import { useArtist } from '@/hooks/use-artist';
import { formatCount } from '@/lib/format';
import type { Album } from '@/types/api';

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

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data: artist, isLoading, error, refetch } = useArtist(id);

  const albums = artist?.albums ?? [];

  const topRated = useMemo(() => {
    return albums
      .filter(album => album.avg_rating != null && album.total_ratings > 0)
      .sort((a, b) => b.popularity_score - a.popularity_score)
      .slice(0, 5);
  }, [albums]);

  const discographyRows = useMemo(() => {
    const sorted = [...albums].sort((a, b) => {
      const aMs = Date.parse(a.release_date);
      const bMs = Date.parse(b.release_date);
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });
    return chunk(sorted, 3);
  }, [albums]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <SkeletonCard height={width + insets.top} borderRadius={0} />
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonCard height={34} borderRadius={6} width="70%" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonCard height={28} borderRadius={100} width={64} />
              <SkeletonCard height={28} borderRadius={100} width={80} />
              <SkeletonCard height={28} borderRadius={100} width={52} />
            </View>
            <View style={{ paddingTop: 8 }}>
              <SkeletonCard height={40} borderRadius={8} width="50%" />
            </View>
            <View style={{ paddingTop: 12, gap: 4 }}>
              {[0, 1, 2].map(row => (
                <View key={row} style={{ flexDirection: 'row', gap: 4 }}>
                  {[0, 1, 2].map(col => (
                    <View key={col} style={{ flex: 1 }}>
                      <SkeletonCard height={110} borderRadius={6} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <HeroBackButton />
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Artist' }} />
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 12 }}>
          Couldn't load artist
        </Text>
        <Pressable onPress={() => refetch()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.accent }}>Tap to retry</Text>
        </Pressable>
      </View>
    );
  }

  const hasGenres = artist.genres.length > 0;
  const heroHeight = width + insets.top;
  const initials = getInitials(artist.name);

  return (
    <>
      <Stack.Screen
        options={{
          title: artist.name,
          headerShown: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
      >
        <View style={{ width, height: heroHeight, backgroundColor: Colors.surfaceHigh }}>
          {artist.image_url ? (
            <Image
              source={{ uri: artist.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                // @ts-ignore — experimental_backgroundImage is New Arch / SDK 55
                experimental_backgroundImage:
                  'linear-gradient(135deg, rgba(191,90,242,0.22) 0%, rgba(191,90,242,0.08) 45%, rgba(11,11,11,0.7) 100%)',
              }}
            >
              <Text
                style={{
                  fontSize: 120,
                  lineHeight: 120,
                  fontWeight: '800',
                  color: Colors.textPrimary,
                  opacity: 0.15,
                  letterSpacing: -2,
                }}
              >
                {initials}
              </Text>
            </View>
          )}

          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 96,
              // @ts-ignore — experimental_backgroundImage is New Arch / SDK 55
              experimental_backgroundImage:
                'linear-gradient(to top, rgba(11,11,11,1) 0%, rgba(11,11,11,0.85) 30%, rgba(11,11,11,0.4) 60%, transparent 100%)',
            }}
          >
            <Text
              style={{
                fontSize: 34,
                fontWeight: '700',
                color: Colors.textPrimary,
                letterSpacing: -0.5,
              }}
              numberOfLines={2}
            >
              {artist.name}
            </Text>

            {hasGenres ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  marginHorizontal: -16,
                  paddingHorizontal: 16,
                  gap: 8,
                  paddingTop: 10,
                }}
              >
                {artist.genres.map(genre => (
                  <View
                    key={genre}
                    style={{
                      backgroundColor: Colors.accentDim,
                      borderRadius: 100,
                      borderCurve: 'continuous',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: Colors.accent,
                        textTransform: 'capitalize',
                      }}
                    >
                      {genre}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <HeroBackButton />
        </View>

        <Animated.View
          entering={FadeInDown.delay(0).duration(400).springify()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {artist.avg_rating != null ? artist.avg_rating.toFixed(1) : '—'}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              AVG RATING
            </Text>
          </View>
          <View style={{ width: 1, height: 28, backgroundColor: Colors.separator }} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {albums.length}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              ALBUMS
            </Text>
          </View>
          <View style={{ width: 1, height: 28, backgroundColor: Colors.separator }} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {formatCount(artist.total_ratings)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              RATINGS
            </Text>
          </View>
        </Animated.View>

        <Separator />

        {topRated.length > 0 ? (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={{ paddingTop: 8 }}>
              <SectionHeader title="Top Rated" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {topRated.map((album: Album) => (
                  <View key={album.spotify_id} style={{ width: 180 }}>
                    <AlbumCard album={album} variant="large" showRating />
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
            <Separator />
          </>
        ) : null}

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ paddingTop: 8 }}>
          <SectionHeader title="Discography" />
          <View style={{ paddingHorizontal: 12, gap: 4 }}>
            {discographyRows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: 'row', gap: 4 }}>
                {row.map(album => (
                  <View key={album.spotify_id} style={{ flex: 1 }}>
                    <AlbumCard album={album} variant="compact" showLabel />
                  </View>
                ))}
                {row.length < 3
                  ? Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View key={`empty-${rowIndex}-${i}`} style={{ flex: 1 }} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </>
  );
}
