import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { StarRating } from '@/components/star-rating';
import type { FeedActivity, User } from '@/types/api';

interface ActivityCardProps {
  activity: FeedActivity;
  index?: number;
  /** When viewing a profile, pass the profile user so follow copy shows "You followed X" / "X followed you" */
  profileUser?: User | null;
  /** When true, hides the user header on rate/review cards (used on profile screens) */
  isProfileView?: boolean;
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

/** Follow activity_data: API sends { follower, following } (User objects); support flat followed_* for backward compat */
function getFollowedUser(data: Record<string, unknown>): { avatarUrl: string | null; displayName: string; username: string } {
  const following = data.following as User | undefined;
  if (following) {
    const name = `${following.first_name} ${following.last_name}`.trim() || following.username;
    return { avatarUrl: following.avatar_url ?? null, displayName: name, username: following.username };
  }
  return {
    avatarUrl: (data.followed_avatar as string | null) ?? null,
    displayName: (data.followed_name as string) || '?',
    username: (data.followed_username as string) ?? '',
  };
}

function UserVerb({
  activity,
}: {
  activity: FeedActivity;
}) {
  const verb =
    activity.activity_type === 'album_rating' || activity.activity_type === 'song_rating'
      ? 'rated'
      : activity.activity_type === 'album_review' || activity.activity_type === 'song_review'
        ? 'reviewed'
        : 'is now following';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <AvatarImage
        uri={activity.user.avatar_url}
        size={40}
        displayName={displayName(activity.user)}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, color: Colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
          {displayName(activity.user)}
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{verb}</Text>
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

/** Profile-view follow activity: compact one-line row */
function ProfileFollowCard({
  activity,
  profileUser,
  index,
}: {
  activity: FeedActivity;
  profileUser: User;
  index: number;
}) {
  const router = useRouter();
  const data = (activity.activity_data ?? {}) as Record<string, unknown>;
  const following = data.following as User | undefined;
  const actorId = activity.user.id;

  // Determine which user to show and what text to display
  const isYouFollowedSomeone = actorId === profileUser.id;
  const targetUser = isYouFollowedSomeone ? getFollowedUser(data) : {
    avatarUrl: activity.user.avatar_url ?? null,
    displayName: displayName(activity.user),
    username: activity.user.username,
  };

  const label = isYouFollowedSomeone
    ? `You started following ${targetUser.displayName}`
    : `${targetUser.displayName} followed you`;

  function handlePress() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/user/${targetUser.username}`);
  }

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 12).duration(300)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          backgroundColor: Colors.surface,
          borderRadius: 16,
          borderCurve: 'continuous',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AvatarImage
          uri={targetUser.avatarUrl}
          size={40}
          displayName={targetUser.displayName}
        />
        <Text
          style={{ flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 19 }}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.textTertiary }}>
          {formatRelativeTime(activity.created_at)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Filter activities for profile screens:
 * - Removes rating activities when a review for the same item exists (dedup)
 * - Optionally removes follow activities (for non-own profiles)
 */
export function filterProfileActivities(
  activities: FeedActivity[],
  options: { showFollowActivities: boolean }
): FeedActivity[] {
  // Build a set of "user:album/song" keys from review activities
  const reviewedKeys = new Set<string>();
  for (const a of activities) {
    if (a.activity_type === 'album_review' || a.activity_type === 'song_review') {
      const data = (a.activity_data ?? {}) as Record<string, unknown>;
      const key = `${a.user.id}:${data.album_spotify_id ?? ''}:${data.song ?? ''}`;
      reviewedKeys.add(key);
    }
  }

  return activities.filter((a) => {
    // Filter out follow activities if not wanted
    if (a.activity_type === 'follow' && !options.showFollowActivities) {
      return false;
    }
    // Filter out rating activities when a review exists for the same item
    if (a.activity_type === 'album_rating' || a.activity_type === 'song_rating') {
      const data = (a.activity_data ?? {}) as Record<string, unknown>;
      const key = `${a.user.id}:${data.album_spotify_id ?? ''}:${data.song ?? ''}`;
      if (reviewedKeys.has(key)) {
        return false;
      }
    }
    return true;
  });
}

export function ActivityCard({ activity, index = 0, profileUser, isProfileView = false }: ActivityCardProps) {
  const router = useRouter();
  const data = (activity.activity_data ?? {}) as Record<string, unknown>;
  const isFollow = activity.activity_type === 'follow';
  const isRatingOrReview = !isFollow;
  const albumSpotifyId = (data.album_spotify_id ?? '') as string;

  // Profile-view follow activity: compact one-line card
  if (isFollow && isProfileView && profileUser) {
    return (
      <ProfileFollowCard
        activity={activity}
        profileUser={profileUser}
        index={index}
      />
    );
  }

  // Non-profile follow card (feed context)
  let followBlock: ReactNode = null;
  if (isFollow) {
    const followed = getFollowedUser(data);
    followBlock = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AvatarImage
          uri={followed.avatarUrl}
          size={36}
          displayName={followed.displayName}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
            {followed.displayName}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textTertiary }}>
            @{followed.username}
          </Text>
        </View>
      </View>
    );
  }

  const showHeader = !isProfileView || isFollow;

  const isReview = activity.activity_type === 'album_review' || activity.activity_type === 'song_review';
  const reviewId = (data.id ?? '') as string | number;

  const songSpotifyId = (data.song_spotify_id ?? '') as string;

  function handleCardPress() {
    if (isReview && reviewId) {
      router.push(`/review/${reviewId}`);
    } else if (activity.activity_type === 'song_rating' && songSpotifyId) {
      router.push(`/track/${songSpotifyId}`);
    } else if (isRatingOrReview && albumSpotifyId) {
      router.push(`/album/${albumSpotifyId}`);
    }
  }

  const timestamp = formatRelativeTime(activity.created_at);

  const isSongActivity = activity.activity_type === 'song_rating' || activity.activity_type === 'song_review';

  /** Shared album art + metadata block used by both rating and review variants */
  function AlbumMeta() {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AlbumArt imageUrl={(data.album_image ?? data.song_image ?? null) as string | null} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Text
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
              numberOfLines={1}
            >
              {isSongActivity
                ? (data.song_name ?? '') as string
                : (data.album_name ?? '') as string}
            </Text>
            {!showHeader && (
              <Text style={{ fontSize: 12, color: Colors.textTertiary, paddingTop: 2 }}>
                {timestamp}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
            {(data.artist_name ?? '') as string}
          </Text>
          {data.rating || data.rating_value ? (
            <StarRating value={Number(data.rating_value ?? data.rating)} size={16} />
          ) : null}
        </View>
      </View>
    );
  }

  const cardContent = (
    <>
      {/* Header: avatar + name + verb + timestamp (hidden on profile view for rate/review) */}
      {showHeader && (
        <UserVerb activity={activity} />
      )}

      {/* Rating variant */}
      {(activity.activity_type === 'album_rating' || activity.activity_type === 'song_rating') && (
        <AlbumMeta />
      )}

      {/* Review variant */}
      {(activity.activity_type === 'album_review' || activity.activity_type === 'song_review') && (
        <View style={{ gap: 10 }}>
          <AlbumMeta />
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

      {/* Follow variant (feed context) */}
      {followBlock}
    </>
  );

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 12).duration(300)}>
      <Pressable
        onPress={isRatingOrReview && albumSpotifyId ? handleCardPress : undefined}
        disabled={!isRatingOrReview || !albumSpotifyId}
        style={({ pressed }) => ({
          backgroundColor: Colors.surface,
          borderRadius: 16,
          borderCurve: 'continuous',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          padding: 14,
          gap: 12,
          opacity: pressed && isRatingOrReview ? 0.7 : 1,
        })}
      >
        {cardContent}
      </Pressable>
    </Animated.View>
  );
}
