import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';

import { Colors } from '@/constants/colors';
import { RatingBadge } from '@/components/rating-badge';
import type { Song } from '@/types/api';

interface TrackRowProps {
  track: Song;
  userRating?: number;
  onPress?: () => void;
  showTrackNumber?: boolean;
  showAlbumArt?: boolean;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackRow({ track, userRating, onPress, showTrackNumber = true, showAlbumArt = false }: TrackRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Track number */}
      {showTrackNumber && (
        <Text
          style={{
            width: 28,
            fontSize: 13,
            color: Colors.textTertiary,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          }}
        >
          {track.track_number}
        </Text>
      )}

      {/* Album art */}
      {showAlbumArt && (
        <Image
          source={track.album_image ? { uri: track.album_image } : undefined}
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            backgroundColor: Colors.surfaceHigh,
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}

      {/* Title + Artist */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '500', color: Colors.textPrimary }}
          numberOfLines={1}
        >
          {track.name}
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
          {track.artists.map(a => a.name).join(', ')}
        </Text>
      </View>

      {/* Duration + optional rating */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 12, color: Colors.textTertiary, fontVariant: ['tabular-nums'] }}>
          {formatDuration(track.duration_ms)}
        </Text>
        {userRating ? <RatingBadge rating={userRating} /> : null}
      </View>
    </Pressable>
  );
}
