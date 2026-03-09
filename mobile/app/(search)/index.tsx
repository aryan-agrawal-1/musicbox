import { use, useState, useEffect, startTransition, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import SegmentedControl from '@react-native-segmented-control/segmented-control';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { AlbumCard } from '@/components/album-card';
import { TrackRow } from '@/components/track-row';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { AvatarImage } from '@/components/avatar-image';
import { useSearch, useListeningHistory, useUserSearch } from '@/hooks/use-search';
import { usePopularAlbums, usePopularArtists, usePopularUsers } from '@/hooks/use-feed';
import { chunk } from '@/lib/format';
import type { Album, Artist, Song, User } from '@/types/api';

// Sub-components

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

function CircleCarouselSkeleton() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ width: 72, alignItems: 'center', gap: 8 }}>
          <SkeletonCard height={64} borderRadius={32} width={64} />
          <SkeletonCard height={11} borderRadius={4} width={56} />
        </View>
      ))}
    </ScrollView>
  );
}

function ArtistCircle({ artist }: { artist: Artist }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/artist/${artist.id}` as `/${string}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 72, alignItems: 'center', gap: 8 })}
    >
      <Image
        source={artist.image_url ? { uri: artist.image_url } : undefined}
        style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceHigh }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <Text
        style={{ fontSize: 12, color: Colors.textPrimary, textAlign: 'center', fontWeight: '500' }}
        numberOfLines={2}
      >
        {artist.name}
      </Text>
    </Pressable>
  );
}

function UserCircle({ user }: { user: User }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/user/${user.username}` as `/${string}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 72, alignItems: 'center', gap: 8 })}
    >
      <AvatarImage uri={user.avatar_url} size={64} displayName={user.username} />
      <Text
        style={{ fontSize: 12, color: Colors.textPrimary, textAlign: 'center', fontWeight: '500' }}
        numberOfLines={2}
      >
        {user.username}
      </Text>
    </Pressable>
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

function ArtistRow({ artist }: { artist: Artist }) {
  const router = useRouter();
  const imageUrl = artist.image_url ?? undefined;
  const genre = artist.genres?.[0];
  return (
    <Pressable
      onPress={() => router.push(`/artist/${artist.id}` as `/${string}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Image
          source={imageUrl ? { uri: imageUrl } : undefined}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceHigh }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
            numberOfLines={1}
          >
            {artist.name}
          </Text>
          {genre ? (
            <Text
              style={{ fontSize: 13, color: Colors.textSecondary }}
              numberOfLines={1}
            >
              {genre}
            </Text>
          ) : null}
        </View>
        <Image
          source="sf:chevron.right"
          style={{ width: 14, height: 14, opacity: 0.3 }}
          tintColor={Colors.textPrimary}
        />
      </View>
    </Pressable>
  );
}

function UserRow({ user }: { user: User }) {
  const router = useRouter();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return (
    <Pressable
      onPress={() => router.push(`/user/${user.username}` as `/${string}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <AvatarImage uri={user.avatar_url} size={44} displayName={user.username} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }}
            numberOfLines={1}
          >
            {user.username}
          </Text>
          {fullName ? (
            <Text style={{ fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
              {fullName}
            </Text>
          ) : null}
        </View>
        <Image
          source="sf:chevron.right"
          style={{ width: 14, height: 14, opacity: 0.3 }}
          tintColor={Colors.textPrimary}
        />
      </View>
    </Pressable>
  );
}

function SearchResultsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <SkeletonCard key={i} height={56} borderRadius={8} />
      ))}
    </View>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 64, gap: 12 }}>
      <Image
        source="sf:magnifyingglass"
        style={{ width: 40, height: 40, opacity: 0.25 }}
        tintColor={Colors.textPrimary}
      />
      <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center' }}>
        No results for "{query}"
      </Text>
      <Text style={{ fontSize: 13, color: Colors.textTertiary, textAlign: 'center' }}>
        Try different keywords
      </Text>
    </View>
  );
}


export default function SearchScreen() {
  const router = useRouter();
  const auth = use(AuthContext);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segment, setSegment] = useState(0);

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchData, isLoading: searchLoading } = useSearch(debouncedQuery);
  const { data: userResults, isLoading: userLoading } = useUserSearch(debouncedQuery);
  const { data: popularData, isLoading: popularLoading, error: popularError, refetch: refetchPopular } = usePopularAlbums();
  const { data: popularArtistsData, isLoading: artistsLoading } = usePopularArtists();
  const { data: popularUsersData, isLoading: usersLoading } = usePopularUsers();
  const { data: historyData } = useListeningHistory(
    auth.user?.is_spotify_connected ?? auth.user?.is_apple_music_connected ?? false
  );

  // Deduplicate listening history by album — single-pass with Set (O(n))
  const recentAlbums = useMemo<Album[]>(() => {
    const entries = historyData?.results;
    if (!entries || entries.length === 0) return [];
    const seen = new Set<number>();
    const albums: Album[] = [];
    for (const entry of entries) {
      const albumId = entry.song.album_id;
      if (!seen.has(albumId)) {
        seen.add(albumId);
        albums.push({
          id: albumId,
          spotify_id: entry.song.album_spotify_id,
          apple_music_id: null,
          name: entry.song.album_name,
          image_url: entry.song.album_image,
          artists: entry.song.artists,
          album_type: 'album',
          release_date: '',
          total_tracks: 0,
          genres: [],
          avg_rating: null,
          total_ratings: 0,
          popularity_score: 0,
        });
      }
      if (albums.length >= 10) break;
    }
    return albums;
  }, [historyData]);

  const albums: Album[] = searchData?.albums ?? [];
  const tracks: Song[] = searchData?.tracks ?? [];
  const artists: Artist[] = searchData?.artists ?? [];
  const users: User[] = userResults ?? [];

  const isSearchActive = debouncedQuery.length >= 2;

  const isLoading = searchLoading || userLoading;
  const activeSegmentEmpty =
    (segment === 0 && albums.length === 0) ||
    (segment === 1 && tracks.length === 0) ||
    (segment === 2 && artists.length === 0) ||
    (segment === 3 && users.length === 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerSearchBarOptions: {
            placeholder: 'Albums, tracks, artists, users',
            autoCapitalize: 'none',
            tintColor: Colors.accent,
            onChangeText: (e: { nativeEvent: { text: string } }) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => {
              setQuery('');
              setDebouncedQuery('');
            },
          },
        }}
      />

      {isSearchActive ? (
        /* ── Results state ── */
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardDismissMode="on-drag"
        >
          {/* Segmented control */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <SegmentedControl
              values={['Albums', 'Tracks', 'Artists', 'Users']}
              selectedIndex={segment}
              onChange={e =>
                startTransition(() => setSegment(e.nativeEvent.selectedSegmentIndex))
              }
              tintColor={Colors.accent}
              backgroundColor={Colors.surfaceElevated}
              fontStyle={{ color: Colors.textSecondary }}
              activeFontStyle={{ color: Colors.textPrimary, fontWeight: '600' }}
            />
          </View>

          {isLoading && !searchData && !userResults ? (
            <SearchResultsSkeleton />
          ) : activeSegmentEmpty && !isLoading ? (
            <NoResults query={debouncedQuery} />
          ) : (
            <>
              {/* Albums — 3-col grid via View rows (max 10 items, no FlatList nesting needed) */}
              {segment === 0 && albums.length > 0 && (
                <View style={{ paddingHorizontal: 12, paddingTop: 4, gap: 4 }}>
                  {chunk(albums, 3).map((row, ri) => (
                    <View key={row[0]?.id ?? String(ri)} style={{ flexDirection: 'row', gap: 4 }}>
                      {row.map(album => (
                        <View key={album.id} style={{ flex: 1 }}>
                          <AlbumCard album={album} variant="compact" showLabel />
                        </View>
                      ))}
                      {/* Fill empty cells in last row */}
                      {row.length < 3 &&
                        Array.from({ length: 3 - row.length }).map((_, i) => (
                          <View key={`empty-${i}`} style={{ flex: 1 }} />
                        ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Tracks — simple list */}
              {segment === 1 && tracks.length > 0 && (
                <View>
                  {tracks.map((track, i) => (
                    <View key={track.id}>
                      <TrackRow
                        track={track}
                        showTrackNumber={false}
                        showAlbumArt
                        onPress={() =>
                          router.push(`/track/${track.id}` as `/${string}`)
                        }
                      />
                      {i < tracks.length - 1 && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: Colors.separator,
                            marginLeft: 16,
                          }}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Users — simple list */}
              {segment === 3 && users.length > 0 && (
                <View>
                  {users.map((user, i) => (
                    <View key={user.id}>
                      <UserRow user={user} />
                      {i < users.length - 1 && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: Colors.separator,
                            marginLeft: 72,
                          }}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Artists — simple list */}
              {segment === 2 && artists.length > 0 && (
                <View>
                  {artists.map((artist, i) => (
                    <View key={artist.id}>
                      <ArtistRow artist={artist} />
                      {i < artists.length - 1 && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: Colors.separator,
                            marginLeft: 72,
                          }}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        /* ── Browse state ── */
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 48, gap: 24, paddingTop: 8 }}
          keyboardDismissMode="on-drag"
        >
          {/* Recently Played — only shown when history has data */}
          {recentAlbums.length > 0 && (
            <View>
              <SectionHeader title="Recently Played" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {recentAlbums.map(album => (
                  <View key={album.id} style={{ width: 160 }}>
                    <AlbumCard album={album} variant="large" showRating={false} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Popular Artists */}
          <View>
            <SectionHeader title="Popular Artists" />
            {artistsLoading ? (
              <CircleCarouselSkeleton />
            ) : (popularArtistsData ?? []).length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              >
                {(popularArtistsData ?? []).map(artist => (
                  <ArtistCircle key={artist.id} artist={artist} />
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* Popular Albums */}
          <View>
            <SectionHeader title="Popular Albums" />
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
                  <View key={album.id} style={{ width: 160 }}>
                    <AlbumCard album={album} variant="large" showRating />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Popular Users */}
          <View>
            <SectionHeader title="Popular Users" />
            {usersLoading ? (
              <CircleCarouselSkeleton />
            ) : (popularUsersData ?? []).length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              >
                {(popularUsersData ?? []).map(user => (
                  <UserCircle key={user.id} user={user} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        </ScrollView>
      )}
    </>
  );
}

