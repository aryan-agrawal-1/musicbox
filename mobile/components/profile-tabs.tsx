import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { ActivityCard, filterProfileActivities } from '@/components/activity-card';
import { ReviewCard } from '@/components/review-card';
import { SkeletonCard } from '@/components/skeleton-card';
import {
  useUserActivity,
  useUserRatings,
  useUserReviews,
} from '@/hooks/use-profile';
import { displayName, chunk } from '@/lib/format';
import type {
  User,
  AlbumRating,
  SongRating,
  AlbumReview,
  SongReview,
  FeedActivity,
} from '@/types/api';

export { displayName };


function RatingGridItem({ rating }: { rating: AlbumRating | SongRating }) {
  const router = useRouter();
  const isSong = 'song' in rating;
  const href = isSong
    ? (`/track/${(rating as SongRating).song}` as `/${string}`)
    : (`/album/${(rating as AlbumRating).album}` as `/${string}`);

  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
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
          source={rating.album_image ? { uri: rating.album_image } : undefined}
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
            paddingHorizontal: 6,
            paddingBottom: 6,
            paddingTop: 24,
            // @ts-ignore
            experimental_backgroundImage:
              'linear-gradient(to top, rgba(0,0,0,0.85), transparent 100%)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Image
              source="sf:star.fill"
              style={{ width: 10, height: 10 }}
              tintColor={Colors.accent}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: Colors.accent,
                fontVariant: ['tabular-nums'],
              }}
            >
              {Number(rating.rating).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: Colors.textPrimary,
          marginTop: 4,
          lineHeight: 14,
        }}
        numberOfLines={1}
      >
        {isSong ? (rating as SongRating).song_name : rating.album_name}
      </Text>
    </Pressable>
  );
}

// Tabs

export function ActivityTab({
  username,
  profileUser,
  showFollowActivities = false,
}: {
  username: string;
  profileUser: User | null;
  showFollowActivities?: boolean;
}) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserActivity(username);

  const rawActivities = data?.pages.flatMap((p) => p.results) ?? [];
  const activities = filterProfileActivities(rawActivities, { showFollowActivities });

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} height={130} borderRadius={16} />
        ))}
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
        <Image
          source="sf:music.note.list"
          style={{ width: 32, height: 32 }}
          tintColor={Colors.textTertiary}
        />
        <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
          No activity yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {activities.map((activity: FeedActivity, i: number) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          index={i}
          profileUser={profileUser}
          isProfileView
        />
      ))}
      {hasNextPage && (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ alignItems: 'center', paddingVertical: 12 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isFetchingNextPage ? Colors.textTertiary : Colors.accent,
            }}
          >
            {isFetchingNextPage ? 'Loading\u2026' : 'Load more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function RatingsTab({ username }: { username: string }) {
  const { width } = useWindowDimensions();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserRatings(username);

  const ratings = data?.pages.flatMap((p) => p.results) ?? [];

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 12, gap: 4 }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map((col) => (
              <View key={col} style={{ flex: 1 }}>
                <SkeletonCard height={(width - 32) / 3} borderRadius={6} />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (ratings.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
        <Image
          source="sf:star"
          style={{ width: 32, height: 32 }}
          tintColor={Colors.textTertiary}
        />
        <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
          No ratings yet
        </Text>
      </View>
    );
  }

  const rows = chunk(ratings, 3);

  return (
    <View style={{ paddingHorizontal: 12, gap: 4 }}>
      {rows.map((row, rowIndex) => (
        <Animated.View
          key={rowIndex}
          entering={FadeInDown.delay(Math.min(rowIndex, 6) * 50)
            .duration(350)
            .springify()}
          style={{ flexDirection: 'row', gap: 4 }}
        >
          {row.map((rating: AlbumRating | SongRating) => (
            <View
              key={`${'song' in rating ? 'song' : 'album'}-${rating.id}`}
              style={{ flex: 1 }}
            >
              <RatingGridItem rating={rating} />
            </View>
          ))}
          {row.length < 3
            ? Array.from({ length: 3 - row.length }).map((_, i) => (
                <View key={`empty-${rowIndex}-${i}`} style={{ flex: 1 }} />
              ))
            : null}
        </Animated.View>
      ))}
      {hasNextPage && (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ alignItems: 'center', paddingVertical: 16 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isFetchingNextPage ? Colors.textTertiary : Colors.accent,
            }}
          >
            {isFetchingNextPage ? 'Loading\u2026' : 'Load more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ReviewsTab({ username }: { username: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserReviews(username);

  const reviews = data?.pages.flatMap((p) => p.results) ?? [];

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} height={110} borderRadius={12} />
        ))}
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
        <Image
          source="sf:text.quote"
          style={{ width: 32, height: 32 }}
          tintColor={Colors.textTertiary}
        />
        <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
          No reviews yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {reviews.map((review: AlbumReview | SongReview, i: number) => (
        <Animated.View
          key={`${'song' in review ? 'song' : 'album'}-${review.id}`}
          entering={FadeInDown.delay(Math.min(i, 8) * 40)
            .duration(300)
            .springify()}
        >
          <ReviewCard review={review} type={'song' in review ? 'song' : 'album'} />
        </Animated.View>
      ))}
      {hasNextPage && (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ alignItems: 'center', paddingVertical: 12 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: isFetchingNextPage ? Colors.textTertiary : Colors.accent,
            }}
          >
            {isFetchingNextPage ? 'Loading\u2026' : 'Load more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
