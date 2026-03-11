import { useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import { useToggleReviewLike } from '@/hooks/use-review-detail';
import { formatRelativeTime, displayName } from '@/lib/format';
import type { AlbumReview, SongReview } from '@/types/api';

interface ReviewCardProps {
  review: AlbumReview | SongReview;
  type?: 'album' | 'song';
}

export function ReviewCard({ review, type = 'album' }: ReviewCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(review.is_liked);
  const [likesCount, setLikesCount] = useState(review.likes_count);
  const toggleLike = useToggleReviewLike(String(review.id), type);
  const lastTapRef = useRef(0);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleLike() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const prev = { isLiked, likesCount };
    setIsLiked(!isLiked);
    setLikesCount(prev => prev + (isLiked ? -1 : 1));
    try {
      await toggleLike.mutateAsync({ liked: isLiked });
    } catch {
      setIsLiked(prev.isLiked);
      setLikesCount(prev.likesCount);
    }
  }

  function handleCardPress() {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = isDoubleTap ? 0 : now;

    if (isDoubleTap) {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
      handleLike();
    } else {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null;
        router.push({ pathname: '/review/[id]', params: { id: String(review.id), type } });
      }, 300);
    }
  }

  return (
    <Pressable
      onPress={handleCardPress}
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

      {/* Album / track info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {review.album_image && (
          <Image
            source={{ uri: review.album_image }}
            style={{ width: 36, height: 36, borderRadius: 5 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
            {type === 'song' ? (review as SongReview).song_name : review.album_name}
          </Text>
          {type === 'song' && (
            <Text style={{ fontSize: 11, color: Colors.textTertiary }} numberOfLines={1}>
              {review.album_name}
            </Text>
          )}
          <Text style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 1 }}>
            {type === 'song' ? 'Track Review' : 'Album Review'}
          </Text>
        </View>
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
