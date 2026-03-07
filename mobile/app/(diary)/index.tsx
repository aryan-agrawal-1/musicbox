import { use, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, SectionList, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { SkeletonCard } from '@/components/skeleton-card';
import { SpotifyConnectPanel } from '@/components/spotify-connect-panel';
import { useDiary, useSyncListeningHistory } from '@/hooks/use-diary';
import { formatDiaryDate } from '@/lib/format';
import { connectSpotify } from '@/lib/spotify';
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
  const time = new Date(entry.played_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Link href={`/(diary)/track/${song.spotify_id}` as `/${string}`} asChild>
      <Link.Trigger>
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

            <Text
              style={{ fontSize: 12, color: Colors.textTertiary, fontVariant: ['tabular-nums'] }}
            >
              {time}
            </Text>
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction title="Go to Track" icon="music.note" />
        <Link.MenuAction title="Go to Album" icon="square.stack" />
        <Link.MenuAction title="Go to Artist" icon="person.crop.circle" />
      </Link.Menu>
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

type ConnectPhase = 'idle' | 'auth' | 'syncing';

interface DiaryEmptyProps {
  isSpotifyConnected: boolean;
  connectPhase: ConnectPhase;
  onConnect: () => void;
}

function DiaryEmpty({ isSpotifyConnected, connectPhase, onConnect }: DiaryEmptyProps) {
  const isConnecting = connectPhase !== 'idle';

  if (isSpotifyConnected) {
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
          Tap the sync button above to import your recent tracks from Spotify.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: 48, paddingBottom: 48 }}
    >
      <SpotifyConnectPanel
        title="Connect Spotify"
        description="Link your Spotify account to start tracking your listening history."
        isConnecting={isConnecting}
        loadingLabel={connectPhase === 'auth' ? 'Opening Spotify…' : 'Syncing your history…'}
        onConnect={onConnect}
      />
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
  const [connectPhase, setConnectPhase] = useState<ConnectPhase>('idle');
  const hasSyncedOnMount = useRef(false);
  const auth = use(AuthContext);

  const {
    data,
    dataUpdatedAt,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiary(auth.user?.is_spotify_connected ?? false);

  const syncMutation = useSyncListeningHistory();

  // Auto-sync on mount if data is stale (or missing)
  useEffect(() => {
    if (hasSyncedOnMount.current) return;
    hasSyncedOnMount.current = true;

    const isStale = Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;
    if (isStale) {
      syncMutation.mutate();
    }
  }, []);

  const allEntries = data?.pages.flatMap(p => p.results) ?? [];

  const sections: DiarySection[] = [];
  const sectionMap = new Map<string, ListeningHistory[]>();
  for (const entry of allEntries) {
    const key = formatDiaryDate(entry.played_at);
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key)!.push(entry);
  }
  for (const [title, items] of sectionMap) {
    sections.push({ title, data: items });
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

  async function handleConnectSpotify() {
    setConnectPhase('auth');
    try {
      const connected = await connectSpotify();
      if (connected) {
        setConnectPhase('syncing');
        await auth.refreshUser();
        await syncMutation.mutateAsync().catch(() => null);
      }
    } catch {
      // silently fail
    } finally {
      setConnectPhase('idle');
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Diary',
          headerRight: auth.user?.is_spotify_connected
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
          isSpotifyConnected={auth.user?.is_spotify_connected ?? false}
          connectPhase={connectPhase}
          onConnect={handleConnectSpotify}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderItem={renderDiaryItem}
          renderSectionHeader={({ section }) => (
            <DiarySectionHeader title={section.title} />
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
