import { use, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, SectionList, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Link, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { SkeletonCard } from '@/components/skeleton-card';
import { AppleMusicConnectPanel } from '@/components/apple-music-connect-panel';
import { useDiary, useSyncListeningHistory } from '@/hooks/use-diary';
import { useAppleMusicConnect } from '@/hooks/use-apple-music-connect';
import { formatDiaryDate } from '@/lib/format';
import { AuthContext } from '@/contexts/auth-context';
import type { ListeningHistory } from '@/types/api';

// 5 min before auto-syncing on mount
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// header

function DiarySectionHeader({ title }: { title: string }) {
  return (
    <View
      style={{
        backgroundColor: Colors.background,
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 6,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary }}>
        {title}
      </Text>
    </View>
  );
}

// Diary row

function DiaryRow({ entry }: { entry: ListeningHistory }) {
  const song = entry.song;
  const showsSyntheticTimestamp = entry.context_type === 'apple_music';
  const time = new Date(entry.played_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Link href={`/track/${song.id}` as `/${string}`} asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: Colors.surfaceHigh,
            }}
          >
            <Image
              source={song.album_image ? { uri: song.album_image } : undefined}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
              numberOfLines={1}
            >
              {song.name}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
              {song.artists.map(a => a.name).join(', ')}
            </Text>
          </View>

          {!showsSyntheticTimestamp ? (
            <Text
              style={{ fontSize: 12, color: Colors.textTertiary, fontVariant: ['tabular-nums'] }}
            >
              {time}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

// Separator

function RowSeparator() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: Colors.separator,
        marginLeft: 16 + 48 + 12,
      }}
    />
  );
}

// List header

function ListHeader() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      <Text style={{ fontSize: 15, color: Colors.textSecondary }}>Your listening history</Text>
    </View>
  );
}

// skeleton

function DiarySkeleton() {
  return (
    <View style={{ paddingTop: 10 }}>
      {[0, 1, 2].map(section => (
        <View key={section} style={{ marginBottom: 16 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 }}>
            <SkeletonCard height={16} borderRadius={4} width={100} />
          </View>
          {[0, 1, 2, 3].map(row => (
            <View
              key={row}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <SkeletonCard width={48} height={48} borderRadius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonCard height={15} borderRadius={4} />
                <SkeletonCard height={13} borderRadius={4} width="60%" />
              </View>
              <SkeletonCard height={12} borderRadius={4} width={52} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Empty state

interface DiaryEmptyProps {
  isAppleMusicConnected: boolean;
  isConnecting: boolean;
  loadingLabel: string;
  error?: string | null;
  onConnect: () => void;
  onSpotifyPress?: () => void;
  spotifyPetitionSigned?: boolean;
  spotifyPetitionCount?: number;
}

function DiaryEmpty({ isAppleMusicConnected, isConnecting, loadingLabel, error, onConnect, onSpotifyPress, spotifyPetitionSigned, spotifyPetitionCount }: DiaryEmptyProps) {
  if (isAppleMusicConnected) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ alignItems: 'center', paddingTop: 64, gap: 12, paddingHorizontal: 32 }}
      >
        <Image
          source="sf:arrow.clockwise"
          style={{ width: 36, height: 36, opacity: 0.2 }}
          tintColor={Colors.textPrimary}
        />
        <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' }}>
          No listening history yet
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          Tap the sync button above to import your recent tracks from Apple Music.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: 48, paddingBottom: 48 }}
    >
      <AppleMusicConnectPanel
        title="Connect Apple Music"
        description="Link your Apple Music account to start tracking your listening history."
        isConnecting={isConnecting}
        loadingLabel={loadingLabel}
        error={error}
        onConnect={onConnect}
      />
      {!isConnecting && (
        spotifyPetitionSigned ? (
          <Text style={{ fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: 16, paddingHorizontal: 32 }}>
            {(spotifyPetitionCount ?? 0) >= 500
              ? `You and ${((spotifyPetitionCount ?? 0) - 1).toLocaleString()} other people want Spotify`
              : 'You signed the Spotify petition'}
          </Text>
        ) : onSpotifyPress ? (
          <Pressable onPress={onSpotifyPress} hitSlop={12} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ fontSize: 13, color: Colors.textTertiary }}>
              Want Spotify instead? →
            </Text>
          </Pressable>
        ) : null
      )}
    </ScrollView>
  );
}

// Error state

function DiaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 }}>
      <Image
        source="sf:exclamationmark.triangle.fill"
        style={{ width: 40, height: 40, opacity: 0.25 }}
        tintColor={Colors.textPrimary}
      />
      <Text
        style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' }}
      >
        Couldn't load history
      </Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={{ fontSize: 14, color: Colors.accent }}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

// Main screen

type DiarySection = {
  title: string;
  data: ListeningHistory[];
};

export default function DiaryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const hasSyncedOnMount = useRef(false);
  const auth = use(AuthContext);
  const router = useRouter();

  const {
    data,
    dataUpdatedAt,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiary(auth.user?.is_apple_music_connected ?? false);

  const syncMutation = useSyncListeningHistory();

  const {
    connect: handleConnectAppleMusic,
    isConnecting,
    loadingLabel: connectLoadingLabel,
    error: connectError,
  } = useAppleMusicConnect(async () => {
    await auth.refreshUser();
    await syncMutation.mutateAsync().catch(() => null);
  });

  // Auto-sync on mount if data is stale (or missing)
  useEffect(() => {
    if (hasSyncedOnMount.current) return;
    hasSyncedOnMount.current = true;

    const isStale = Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;
    if (isStale && auth.user?.is_apple_music_connected) {
      syncMutation.mutate();
    }
  }, []);

  const allEntries = data?.pages.flatMap(p => p.results) ?? [];
  const hasOnlySyntheticAppleHistory =
    allEntries.length > 0 && allEntries.every(entry => entry.context_type === 'apple_music');

  const sections: DiarySection[] = [];
  if (hasOnlySyntheticAppleHistory) {
    sections.push({ title: '', data: allEntries });
  } else {
    const sectionMap = new Map<string, ListeningHistory[]>();
    for (const entry of allEntries) {
      const key = formatDiaryDate(entry.played_at);
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(entry);
    }
    for (const [title, items] of sectionMap) {
      sections.push({ title, data: items });
    }
  }

  const renderDiaryItem = useCallback(({ item }: { item: ListeningHistory }) => <DiaryRow entry={item} />, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), syncMutation.mutateAsync().catch(() => null)]);
    setRefreshing(false);
  }

  function handleSync() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    syncMutation.mutate();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Diary',
          headerRight: auth.user?.is_apple_music_connected
            ? () => (
                <Pressable
                  onPress={handleSync}
                  disabled={syncMutation.isPending}
                  hitSlop={8}
                  style={{ opacity: syncMutation.isPending ? 0.5 : 1 }}
                >
                  {syncMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Image
                      source="sf:arrow.clockwise"
                      style={{ width: 20, height: 20 }}
                      tintColor={Colors.accent}
                    />
                  )}
                </Pressable>
              )
            : undefined,
        }}
      />

      {isLoading ? (
        <DiarySkeleton />
      ) : error ? (
        <DiaryError onRetry={refetch} />
      ) : allEntries.length === 0 ? (
        <DiaryEmpty
          isAppleMusicConnected={auth.user?.is_apple_music_connected ?? false}
          isConnecting={isConnecting}
          loadingLabel={connectLoadingLabel}
          error={connectError}
          onConnect={handleConnectAppleMusic}
          spotifyPetitionSigned={auth.user?.spotify_petition_signed}
          spotifyPetitionCount={auth.user?.spotify_petition_count}
          onSpotifyPress={
            auth.user?.spotify_petition_signed
              ? undefined
              : () => router.push('/(diary)/spotify-petition')
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderItem={renderDiaryItem}
          renderSectionHeader={({ section }) => (
            section.title ? <DiarySectionHeader title={section.title} /> : null
          )}
          ItemSeparatorComponent={RowSeparator}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.accent} />
              </View>
            ) : null
          }
          stickySectionHeadersEnabled={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
        />
      )}
    </>
  );
}
