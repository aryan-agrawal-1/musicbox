import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import type { FeedActivity } from '@/types/api';

interface ActivityCardProps {
  activity: FeedActivity;
  index?: number;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function displayName(user: FeedActivity['user']): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

function UserVerb({ activity }: { activity: FeedActivity }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <AvatarImage uri={activity.user.avatar_url} size={40} displayName={displayName(activity.user)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, color: Colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
          {displayName(activity.user)}
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
          {activity.activity_type === 'album_rating' || activity.activity_type === 'song_rating'
            ? 'rated'
            : activity.activity_type === 'album_review' || activity.activity_type === 'song_review'
              ? 'reviewed'
              : 'is now following'}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: Colors.textTertiary }}>
        {formatRelativeTime(activity.created_at)}
      </Text>
    </View>
  );
}

function AlbumArt({ imageUrl }: { imageUrl: string | null }) {
  return (
    <Image
      source={imageUrl ? { uri: imageUrl } : undefined}
      style={{
        width: 72,
        height: 72,
        borderRadius: 6,
        borderCurve: 'continuous',
        backgroundColor: Colors.surfaceHigh,
        alignSelf: 'flex-end',
      }}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  );
}

export function ActivityCard({ activity, index = 0 }: ActivityCardProps) {
  const data = activity.activity_data as Record<string, unknown>;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 10) * 12).duration(300)}
      style={{
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderCurve: 'continuous',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        padding: 14,
        gap: 12,
      }}
    >
      {/* Header: avatar + name + verb + timestamp */}
      <UserVerb activity={activity} />

      {/* Rating variant */}
      {(activity.activity_type === 'album_rating' || activity.activity_type === 'song_rating') && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AlbumArt imageUrl={(data.album_image ?? data.song_image ?? null) as string | null} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
              {(data.album_name ?? data.song_name ?? '') as string}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
              {(data.artist_name ?? '') as string}
            </Text>
            {data.rating ? (
              <StarRating value={Number(data.rating)} size={16} />
            ) : null}
          </View>
        </View>
      )}

      {/* Review variant */}
      {(activity.activity_type === 'album_review' || activity.activity_type === 'song_review') && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AlbumArt imageUrl={(data.album_image ?? data.song_image ?? null) as string | null} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
                {(data.album_name ?? data.song_name ?? '') as string}
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
                {(data.artist_name ?? '') as string}
              </Text>
              {data.rating ? (
                <StarRating value={Number(data.rating)} size={16} />
              ) : null}
            </View>
          </View>
          {data.content ? (
            <View
              style={{
                backgroundColor: Colors.background,
                borderRadius: 8,
                borderCurve: 'continuous',
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }} numberOfLines={2}>
                {(data.content ?? '') as string}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Follow variant */}
      {activity.activity_type === 'follow' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AvatarImage
            uri={(data.followed_avatar ?? null) as string | null}
            size={36}
            displayName={(data.followed_name ?? '?') as string}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
              {(data.followed_name ?? '') as string}
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textTertiary }}>
              @{(data.followed_username ?? '') as string}
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
