import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';

import { Colors } from '@/constants/colors';
import { RatingBadge } from '@/components/rating-badge';
import type { Album } from '@/types/api';

function AlbumArtRatingBadge({ rating }: { rating: number }) {
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

interface AlbumCardProps {
  album: Album;
  variant?: 'large' | 'compact' | 'inline';
  showRating?: boolean;
}

function artistNames(album: Album): string {
  return album.artists.map(a => a.name).join(', ');
}

export function AlbumCard({ album, variant = 'large', showRating = false }: AlbumCardProps) {
  if (variant === 'inline') {
    return (
      <Link href={`/(shared)/album/${album.spotify_id}`} asChild>
        <Pressable>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 6,
                borderCurve: 'continuous',
                overflow: 'hidden',
                backgroundColor: Colors.surfaceHigh,
              }}
            >
              <Image
                source={album.image_url ? { uri: album.image_url } : undefined}
                style={{ width: 60, height: 60 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
                numberOfLines={1}
              >
                {album.name}
              </Text>
              <Text
                style={{ fontSize: 13, color: Colors.textSecondary }}
                numberOfLines={1}
              >
                {artistNames(album)}
              </Text>
            </View>
            {showRating && album.avg_rating ? (
              <RatingBadge rating={album.avg_rating} />
            ) : null}
          </View>
        </Pressable>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/(shared)/album/${album.spotify_id}`} asChild>
        <Pressable>
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: 6,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: Colors.surfaceHigh,
            }}
          >
            <Image
              source={album.image_url ? { uri: album.image_url } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {showRating && album.avg_rating ? (
              <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
                <AlbumArtRatingBadge rating={album.avg_rating} />
              </View>
            ) : null}
          </View>
        </Pressable>
      </Link>
    );
  }

  // Large (default)
  return (
    <Link href={`/(shared)/album/${album.spotify_id}`} asChild>
      <Pressable>
        <View style={{ gap: 6 }}>
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: 8,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: Colors.surfaceHigh,
            }}
          >
            <Image
              source={album.image_url ? { uri: album.image_url } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {showRating && album.avg_rating ? (
              <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
                <AlbumArtRatingBadge rating={album.avg_rating} />
              </View>
            ) : null}
          </View>
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
            numberOfLines={1}
          >
            {album.name}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
            {artistNames(album)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
