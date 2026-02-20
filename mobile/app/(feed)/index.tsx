import { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Link, Stack } from 'expo-router';

import { Colors } from '@/constants/colors';
import { SectionHeader } from '@/components/section-header';
import { AlbumCard } from '@/components/album-card';
import { ActivityCard } from '@/components/activity-card';
import { SkeletonCard } from '@/components/skeleton-card';
import { usePopularAlbums, useNewReleases, useFriendFeed } from '@/hooks/use-feed';
import type { FeedActivity } from '@/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AlbumCarouselSkeleton() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: 160, gap: 6 }}>
          <SkeletonCard height={160} borderRadius={8} />
          <SkeletonCard height={14} borderRadius={4} />
          <SkeletonCard height={12} borderRadius={4} width="70%" />
        </View>
      ))}
    </ScrollView>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable onPress={onRetry} style={{ paddingHorizontal: 16 }} hitSlop={8}>
      <Text style={{ fontSize: 14, color: Colors.textTertiary }}>
        Couldn't load · Tap to retry
      </Text>
    </Pressable>
  );
}

function FriendFeedEmpty() {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 24,
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: Colors.textPrimary,
            textAlign: 'center',
          }}
        >
          Nothing from friends yet
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          Follow people to see their ratings and reviews here.
        </Text>
        <Link href="/(search)" asChild>
          <Pressable
            style={{
              backgroundColor: Colors.accentDim,
              borderRadius: 20,
              borderCurve: 'continuous',
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.accent }}>
              Find friends
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function FriendFeedActivities({
  activities,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  activities: FeedActivity[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {activities.map((activity, i) => (
        <ActivityCard key={activity.id} activity={activity} index={i} />
      ))}
      {hasNextPage && (
        <Pressable
          onPress={onLoadMore}
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
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: popularData,
    isLoading: popularLoading,
    error: popularError,
    refetch: refetchPopular,
  } = usePopularAlbums();

  const {
    data: newData,
    isLoading: newLoading,
    error: newError,
    refetch: refetchNew,
  } = useNewReleases();

  const {
    data: feedData,
    isLoading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFriendFeed();

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchNew(), refetchFeed()]);
    setRefreshing(false);
  }

  const allActivities = feedData?.pages.flatMap(p => p.results) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 48, gap: 24, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >

        {/* ── Most Popular ── */}
        <View>
          <SectionHeader title="Most Popular" />
          {popularLoading ? (
            <AlbumCarouselSkeleton />
          ) : popularError ? (
            <SectionError onRetry={refetchPopular} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {(popularData?.results ?? []).map(album => (
                <View key={album.spotify_id} style={{ width: 160 }}>
                  <AlbumCard album={album} variant="large" showRating />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── New Releases ── */}
        <View>
          <SectionHeader title="New Releases" />
          {newLoading ? (
            <AlbumCarouselSkeleton />
          ) : newError ? (
            <SectionError onRetry={refetchNew} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {(newData?.results ?? []).map(album => (
                <View key={album.spotify_id} style={{ width: 160 }}>
                  <AlbumCard album={album} variant="large" showRating />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── From Your Friends ── */}
        <View>
          <SectionHeader title="From Your Friends" />
          {feedLoading ? (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {[0, 1, 2].map(i => (
                <SkeletonCard key={i} height={130} borderRadius={16} />
              ))}
            </View>
          ) : feedError ? (
            <SectionError onRetry={refetchFeed} />
          ) : allActivities.length === 0 ? (
            <FriendFeedEmpty />
          ) : (
            <FriendFeedActivities
              activities={allActivities}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
            />
          )}
        </View>

      </ScrollView>
    </>
  );
}
