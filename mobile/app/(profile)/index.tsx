import { use, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { AvatarImage } from '@/components/avatar-image';
import {
  ActivityTab,
  RatingsTab,
  ReviewsTab,
  displayName,
} from '@/components/profile-tabs';
import { useUserRatings } from '@/hooks/use-profile';
import { useAvatarUpload } from '@/hooks/use-avatar';
import { formatCount } from '@/lib/format';
import type { User, AlbumRating, SongRating } from '@/types/api';

// Profile Hero (own profile)

function OwnProfileHero({
  user,
  ratings,
  onFollowersPress,
  onFollowingPress,
  onAvatarPress,
}: {
  user: User;
  ratings: Array<AlbumRating | SongRating>;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  onAvatarPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const mosaicImages: string[] = [];
  for (const r of ratings) {
    if (mosaicImages.length >= 3) break;
    if (r.album_image) mosaicImages.push(r.album_image);
  }

  const mosaicTileWidth = width / 3;
  const heroHeight = 200 + insets.top;

  return (
    <View>
      {/* Mosaic background — bleeds into status bar */}
      <View
        style={{
          width,
          height: heroHeight,
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
              // @ts-ignore
              experimental_backgroundImage:
                'linear-gradient(135deg, rgba(191,90,242,0.12) 0%, rgba(11,11,11,0.9) 70%)',
            }}
          />
        )}

        <BlurView
          intensity={40}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

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

      {/* Avatar + Info */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          marginTop: -100,
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ borderRadius: 44, boxShadow: '0 0 0 3px rgba(255,255,255,0.9)' }}>
          <Pressable
            onPress={!user.avatar_url ? onAvatarPress : undefined}
            disabled={!!user.avatar_url}
            style={({ pressed }) => ({
              borderRadius: 44,
              opacity: pressed && !user.avatar_url ? 0.75 : 1,
            })}
          >
            <AvatarImage
              uri={user.avatar_url}
              size={88}
              displayName={displayName(user)}
            />
          </Pressable>
          {!user.avatar_url && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: -2,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: Colors.surfaceHigh,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
              }}
            >
              <Image
                source="sf:camera.fill"
                style={{ width: 12, height: 10 }}
                tintColor={Colors.textPrimary}
              />
            </View>
          )}
        </View>

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

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
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
              {formatCount(user.total_likes_received ?? 0)}
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


const TABS = ['Activity', 'Ratings', 'Reviews'] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = use(AuthContext);
  const [selectedTab, setSelectedTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.user;
  const username = user?.username ?? '';

  const queryClient = useQueryClient();
  const { pickAndUploadAvatar } = useAvatarUpload(auth.refreshUser);
  const ratingsQuery = useUserRatings(username);
  const ratings = ratingsQuery.data?.pages.flatMap((p) => p.results) ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      auth.refreshUser(),
      queryClient.invalidateQueries({ queryKey: ['user-activity', username] }),
      queryClient.invalidateQueries({ queryKey: ['user-ratings', username] }),
      queryClient.invalidateQueries({ queryKey: ['user-reviews', username] }),
    ]);
    setRefreshing(false);
  }

  if (!user) {
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
        <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
          Not logged in
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />

      {/* Gear button — floats above scroll content */}
      <Pressable
        onPress={() => router.push('/(profile)/settings')}
        hitSlop={8}
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(11,11,11,0.5)',
          opacity: pressed ? 0.75 : 1,
          zIndex: 10,
        })}
      >
        <Image
          source="sf:gearshape.fill"
          style={{ width: 18, height: 18 }}
          tintColor={Colors.textPrimary}
        />
      </Pressable>

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
        <OwnProfileHero
          user={user}
          ratings={ratings}
          onFollowersPress={() => router.push('/(profile)/followers')}
          onFollowingPress={() => router.push('/(profile)/following')}
          onAvatarPress={pickAndUploadAvatar}
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
          <ActivityTab username={username} profileUser={user} showFollowActivities />
        )}
        {selectedTab === 1 && <RatingsTab username={username} />}
        {selectedTab === 2 && <ReviewsTab username={username} />}
      </ScrollView>
    </>
  );
}
