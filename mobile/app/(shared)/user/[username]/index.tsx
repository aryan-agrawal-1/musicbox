import { use, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { AvatarImage } from '@/components/avatar-image';
import { SkeletonCard } from '@/components/skeleton-card';
import { HeroBackButton } from '@/components/hero-back-button';
import {
  ActivityTab,
  RatingsTab,
  ReviewsTab,
  displayName,
} from '@/components/profile-tabs';
import {
  useProfile,
  useUserRatings,
  useIsFollowing,
  useFollowMutation,
  useUnfollowMutation,
} from '@/hooks/use-profile';
import { formatCount } from '@/lib/format';
import { usePostHog } from 'posthog-react-native';
import type { User, AlbumRating, SongRating } from '@/types/api';

// Profile Hero

function ProfileHero({
  user,
  ratings,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollowPress,
  onFollowersPress,
  onFollowingPress,
}: {
  user: User;
  ratings: Array<AlbumRating | SongRating>;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onFollowPress: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const mosaicImages: string[] = [];
  for (const r of ratings) {
    if (mosaicImages.length >= 3) break;
    if (r.album_image) mosaicImages.push(r.album_image);
  }

  const mosaicTileWidth = width / 3;

  return (
    <View>
      {/* Mosaic background */}
      <View
        style={{
          width,
          height: 260 + insets.top,
          backgroundColor: Colors.surfaceElevated,
          overflow: 'hidden',
        }}
      >
        {mosaicImages.length > 0 ? (
          <View style={{ flexDirection: 'row', width, height: '100%' }}>
            {[0, 1, 2].map((i) => (
              <Image
                key={i}
                source={
                  mosaicImages[i % mosaicImages.length]
                    ? { uri: mosaicImages[i % mosaicImages.length] }
                    : undefined
                }
                style={{
                  width: mosaicTileWidth,
                  height: '100%',
                  opacity: 0.35,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </View>
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              // @ts-ignore — experimental_backgroundImage is New Arch / SDK 55
              experimental_backgroundImage:
                'linear-gradient(135deg, rgba(191,90,242,0.12) 0%, rgba(11,11,11,0.9) 70%)',
            }}
          />
        )}

        {/* Blur overlay */}
        <BlurView
          intensity={40}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Dark overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,11,11,0.5)',
          }}
        />

        {/* Bottom gradient merge */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            // @ts-ignore
            experimental_backgroundImage:
              'linear-gradient(to top, rgba(11,11,11,1) 0%, transparent 100%)',
          }}
        />
      </View>

      {/* Avatar + Info — overlapping the hero */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          marginTop: -120,
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 24,
        }}
      >
        {/* Avatar */}
        <View style={{ borderRadius: 44, boxShadow: '0 0 0 3px rgba(255,255,255,0.9)' }}>
          <AvatarImage
            uri={user.avatar_url}
            size={88}
            displayName={displayName(user)}
          />
        </View>

        {/* Name */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: Colors.textPrimary,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {displayName(user)}
          </Text>
          <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
            @{user.username}
          </Text>
        </View>

        {/* Bio */}
        {user.bio ? (
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
              maxWidth: 300,
            }}
            numberOfLines={3}
            selectable
          >
            {user.bio}
          </Text>
        ) : null}

        {/* Follow button (only for other users) */}
        {!isOwnProfile && (
          <Animated.View entering={FadeInDown.delay(100).duration(300).springify()}>
            <Pressable
              onPress={onFollowPress}
              disabled={followLoading}
              style={({ pressed }) => ({
                borderRadius: 100,
                paddingHorizontal: 28,
                paddingVertical: 10,
                opacity: pressed || followLoading ? 0.7 : 1,
                ...(isFollowing
                  ? {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.25)',
                    }
                  : {
                      backgroundColor: Colors.accent,
                    }),
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isFollowing ? Colors.textPrimary : '#000000',
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400).springify()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 0,
            paddingTop: 4,
          }}
        >
          <Pressable
            onPress={onFollowersPress}
            hitSlop={4}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingHorizontal: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCount(user.followers_count)}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              FOLLOWERS
            </Text>
          </Pressable>

          <View style={{ width: 1, height: 28, backgroundColor: Colors.separator }} />

          <Pressable
            onPress={onFollowingPress}
            hitSlop={4}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingHorizontal: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCount(user.following_count)}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              FOLLOWING
            </Text>
          </Pressable>

          <View style={{ width: 1, height: 28, backgroundColor: Colors.separator }} />

          <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCount(user.total_albums_rated + user.total_songs_rated)}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              RATINGS
            </Text>
          </View>

          <View style={{ width: 1, height: 28, backgroundColor: Colors.separator }} />

          <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCount(user.total_likes_received)}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: Colors.textTertiary,
              }}
            >
              LIKES
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Screen

const TABS = ['Activity', 'Ratings', 'Reviews'] as const;

export default function UserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);
  const posthog = usePostHog();
  const [selectedTab, setSelectedTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: user, isLoading, error, refetch } = useProfile(username);
  const { data: followData } = useIsFollowing(username);
  const ratingsQuery = useUserRatings(username);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  const isOwnProfile = auth.user?.username === username;
  const isFollowing = followData?.is_following ?? false;
  const followLoading = followMutation.isPending || unfollowMutation.isPending;

  const ratings = ratingsQuery.data?.pages.flatMap((p) => p.results) ?? [];

  function handleFollowPress() {
    if (!user) return;
    if (isFollowing) {
      posthog.capture('user_unfollowed', { target_username: username });
      unfollowMutation.mutate({ userId: user.id, username });
    } else {
      posthog.capture('user_followed', { target_username: username });
      followMutation.mutate({ userId: user.id, username });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Stack.Screen options={{ title: '' }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <SkeletonCard height={260 + insets.top} borderRadius={0} />
          <View style={{ alignItems: 'center', paddingTop: 16, gap: 10 }}>
            <SkeletonCard height={88} width={88} borderRadius={44} />
            <SkeletonCard height={22} width={160} borderRadius={6} />
            <SkeletonCard height={16} width={100} borderRadius={4} />
            <View style={{ flexDirection: 'row', gap: 24, paddingTop: 8 }}>
              <SkeletonCard height={40} width={72} borderRadius={6} />
              <SkeletonCard height={40} width={72} borderRadius={6} />
              <SkeletonCard height={40} width={72} borderRadius={6} />
            </View>
          </View>
        </ScrollView>
        <HeroBackButton />
      </View>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Profile' }} />
        <Text
          style={{
            fontSize: 15,
            color: Colors.textSecondary,
            marginBottom: 12,
          }}
        >
          Couldn't load profile
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.accent }}>
            Tap to retry
          </Text>
        </Pressable>
        <HeroBackButton />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: Colors.textPrimary,
        }}
      />
      <HeroBackButton />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* Hero */}
        <ProfileHero
          user={user}
          ratings={ratings}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowPress={handleFollowPress}
          onFollowersPress={() =>
            router.push(`/user/${username}/followers` as never)
          }
          onFollowingPress={() =>
            router.push(`/user/${username}/following` as never)
          }
        />

        <View
          style={{
            height: 1,
            backgroundColor: Colors.separator,
            marginHorizontal: 16,
            marginTop: 20,
          }}
        />

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
          <SegmentedControl
            values={[...TABS]}
            selectedIndex={selectedTab}
            onChange={(e) => setSelectedTab(e.nativeEvent.selectedSegmentIndex)}
            appearance="dark"
            backgroundColor="transparent"
            activeFontStyle={{ fontSize: 13, fontWeight: '600' }}
            fontStyle={{ fontSize: 13, fontWeight: '500' }}
          />
        </View>

        {selectedTab === 0 && (
          <ActivityTab username={username} profileUser={user} />
        )}
        {selectedTab === 1 && <RatingsTab username={username} />}
        {selectedTab === 2 && <ReviewsTab username={username} />}
      </ScrollView>
    </>
  );
}
