import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import { apiFetch } from '@/lib/api';
import type { AlbumReview, SongReview } from '@/types/api';

interface ReviewCardProps {
  review: AlbumReview | SongReview;
  type?: 'album' | 'song';
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

function displayName(user: (AlbumReview | SongReview)['user']): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function ReviewCard({ review, type = 'album' }: ReviewCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(review.is_liked);
  const [likesCount, setLikesCount] = useState(review.likes_count);

  const reviewBase = type === 'album'
    ? '/api/v1/reviews/albums/reviews'
    : '/api/v1/reviews/songs/reviews';

  async function handleLike() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const prev = { isLiked, likesCount };
    setIsLiked(!isLiked);
    setLikesCount(likesCount + (isLiked ? -1 : 1));
    try {
      await apiFetch<void>(`${reviewBase}/${review.id}/like/`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
    } catch {
      setIsLiked(prev.isLiked);
      setLikesCount(prev.likesCount);
    }
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/review/[id]', params: { id: String(review.id), type } })}
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

      {/* Review excerpt — capped at 3 lines */}
      <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }} numberOfLines={3}>
        {review.content}
      </Text>

      {/* Like button */}
      <Pressable
        onPress={handleLike}
        hitSlop={10}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Image
          source={isLiked ? 'sf:heart.fill' : 'sf:heart'}
          style={{ width: 16, height: 16 }}
          tintColor={isLiked ? '#FF3B30' : Colors.textTertiary}
        />
        {likesCount > 0 && (
          <Text style={{ fontSize: 13, color: isLiked ? '#FF3B30' : Colors.textTertiary }}>
            {likesCount}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}
