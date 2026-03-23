import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { sharePreviewStore } from '@/lib/share-preview-store';
import type { ReviewShareData } from '@/types/share';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { ReviewCard } from '@/components/review-card';
import {
  useReviewDetail,
  useMoreFromUser,
  useToggleReviewLike,
} from '@/hooks/use-review-detail';
import { usePostHog } from 'posthog-react-native';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function displayName(user: { first_name: string; last_name: string; username: string }): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

const HERO_HEIGHT = 360;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { id, type = 'album' } = useLocalSearchParams<{ id: string; type: 'album' | 'song' }>();
  const router = useRouter();
  const posthog = usePostHog();

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const reviewType = (type as 'album' | 'song') ?? 'album';

  // ─── Data ──────────────────────────────────────────────────────────────────
  const { data: review, isLoading: reviewLoading } = useReviewDetail(id, reviewType);

  const { data: moreReviews, isLoading: moreLoading } = useMoreFromUser(
    review?.user.username ?? '',
    id,
    reviewType,
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const toggleReviewLike = useToggleReviewLike(id, reviewType);

  // ─── Double-tap to like ────────────────────────────────────────────────────
  const lastTapRef = useRef(0);

  function handleHeroDoubleTap() {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = isDoubleTap ? 0 : now;
    if (isDoubleTap) handleReviewLike();
  }

  // ─── Like animation ────────────────────────────────────────────────────────
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  function handleReviewLike() {
    if (!review) return;
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 15, stiffness: 600 }),
      withSpring(1.0, { damping: 20, stiffness: 400 }),
    );
    posthog.capture('review_liked', {
      review_type: reviewType,
      liked: !review.is_liked,
    });
    toggleReviewLike.mutate({ liked: review.is_liked });
  }

  function openShareSheet(data: ReviewShareData) {
    const shareId = sharePreviewStore.set({
      variant: 'review',
      data,
    });

    router.push({ pathname: '/share-preview', params: { shareId } });
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (reviewLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <SkeletonCard height={HERO_HEIGHT} borderRadius={0} />
          <View style={{ padding: 20, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <SkeletonCard height={36} borderRadius={18} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonCard height={14} borderRadius={7} />
                <SkeletonCard height={12} borderRadius={6} />
              </View>
            </View>
            <SkeletonCard height={80} borderRadius={12} />
            <SkeletonCard height={20} borderRadius={8} />
          </View>
        </ScrollView>
      </>
    );
  }

  if (!review) return null;

  const mediaName = reviewType === 'album'
    ? review.album_name
    : (review as { song_name: string }).song_name ?? review.album_name;

  const mediaPath = reviewType === 'album'
    ? `/album/${(review as { album: number }).album}`
    : `/track/${(review as { song: number }).song}`;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen
        options={{
          title: mediaName,
          headerLargeTitle: false,
          headerRight: () => (
            <Pressable
              onPress={() =>
                openShareSheet({
                  songOrAlbumName: mediaName,
                  artistName: review.album_name,
                  albumImage: review.album_image,
                  ratingValue: Number(review.rating_value ?? 0),
                  reviewText: review.content ?? '',
                  username: review.user.username,
                  avatarUrl: review.user.avatar_url ?? null,
                  type: reviewType,
                } satisfies ReviewShareData)
              }
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 4 })}
            >
              <Image
                source="sf:square.and.arrow.up"
                style={{ width: 20, height: 20 }}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Hero ── */}
        <Pressable onPress={handleHeroDoubleTap} style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
          {/* Blurred background */}
          <Image
            source={{ uri: review.album_image ?? undefined }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <BlurView
            intensity={88}
            tint="dark"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Gradient fade into page background */}
          <LinearGradient
            colors={['rgba(11,11,11,0)', '#0B0B0B']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 }}
          />

          {/* Hero content */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingHorizontal: 28,
              paddingBottom: 28,
              gap: 10,
            }}
          >
            {/* Tappable album art */}
            <Pressable
              onPress={() => router.push(mediaPath as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Image
                source={{ uri: review.album_image ?? undefined }}
                style={{ width: 112, height: 112, borderRadius: 14 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </Pressable>

            {/* Title + reviewer */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text
                style={{ fontSize: 21, fontWeight: '700', color: '#fff', textAlign: 'center' }}
                numberOfLines={2}
              >
                {mediaName}
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)' }}>
                {reviewType === 'song' ? 'track' : 'album'} review by @{review.user.username}
              </Text>
            </View>

            {/* Stars */}
            {review.rating_value != null && (
              <StarRating value={Number(review.rating_value)} size={18} />
            )}

            {/* Timestamp */}
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {formatRelativeTime(review.created_at)}
            </Text>
          </View>
        </Pressable>

        {/* ── Reviewer row ── */}
        <Pressable
          onPress={() => router.push(`/user/${review.user.username}`)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AvatarImage uri={review.user.avatar_url} size={36} displayName={displayName(review.user)} />
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}>
              {displayName(review.user)}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textTertiary }}>@{review.user.username}</Text>
          </View>
        </Pressable>

        {/* ── Review text ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}>
          <Text
            selectable
            numberOfLines={expanded ? undefined : 7}
            onTextLayout={(e) => {
              if (!expanded && e.nativeEvent.lines.length >= 7) {
                setIsOverflowing(true);
              }
            }}
            style={{ fontSize: 16, color: Colors.textPrimary, lineHeight: 27 }}
          >
            {review.content}
          </Text>
          {isOverflowing && !expanded && (
            <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
              <Text style={{ fontSize: 14, color: Colors.accent, marginTop: 8 }}>Read more</Text>
            </Pressable>
          )}
        </View>

        {/* ── Inline actions ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingBottom: 28 }}>
          {/* Like */}
          <Pressable
            onPress={handleReviewLike}
            hitSlop={10}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
          >
            <Animated.View style={heartStyle}>
              <Image
                source={review.is_liked ? 'sf:heart.fill' : 'sf:heart'}
                style={{ width: 17, height: 17 }}
                tintColor={review.is_liked ? '#FF3B30' : Colors.textTertiary}
              />
            </Animated.View>
            <Text style={{ fontSize: 14, color: review.is_liked ? '#FF3B30' : Colors.textTertiary, fontVariant: ['tabular-nums'] }}>
              {review.likes_count > 0 ? review.likes_count : 'Like'}
            </Text>
          </Pressable>

          {/* Comment */}
          <Pressable
            onPress={() => router.push({ pathname: '/review/comments', params: { reviewId: id, type: reviewType } })}
            hitSlop={10}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
          >
            <Image
              source="sf:bubble.left"
              style={{ width: 17, height: 17 }}
              tintColor={Colors.textTertiary}
            />
            <Text style={{ fontSize: 14, color: Colors.textTertiary, fontVariant: ['tabular-nums'] }}>
              {review.comments_count > 0 ? review.comments_count : 'Comment'}
            </Text>
          </Pressable>
        </View>

        {/* ── More from user ── */}
        {(moreReviews?.results?.length ?? 0) > 0 && (
          <View style={{ marginTop: 4 }}>
            <SectionHeader title={`More from @${review.user.username}`} />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {moreLoading
                ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={90} borderRadius={12} />)
                : moreReviews!.results.map((r) => (
                    <ReviewCard key={r.id} review={r} type={reviewType} />
                  ))}
            </View>
          </View>
        )}
      </ScrollView>

    </View>
  );
}
