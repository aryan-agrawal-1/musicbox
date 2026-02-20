import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import type { AlbumReview } from '@/types/api';

interface ReviewCardProps {
  review: AlbumReview;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function displayName(user: AlbumReview['user']): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/(shared)/review/${review.id}`)}
      style={({ pressed }) => ({
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 12,
        borderCurve: 'continuous',
        padding: 14,
        gap: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AvatarImage
          uri={review.user.avatar_url}
          size={32}
          displayName={displayName(review.user)}
        />
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1 }} numberOfLines={1}>
          {displayName(review.user)}
        </Text>
        {review.rating_value ? (
          <StarRating value={review.rating_value} size={14} />
        ) : null}
        <Text style={{ fontSize: 12, color: Colors.textTertiary }}>
          {formatRelativeTime(review.created_at)}
        </Text>
      </View>

      {/* Review excerpt */}
      <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }} numberOfLines={2}>
        {review.content}
      </Text>

      {/* Likes */}
      <Text style={{ fontSize: 12, color: Colors.textTertiary, textAlign: 'right' }}>
        ♥ {review.likes_count}
      </Text>
    </Pressable>
  );
}
