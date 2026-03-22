import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Album, Song, Artist, User, ListeningHistory, PaginatedResponse } from '@/types/api';

export interface SearchResults {
  albums?: Album[];
  tracks?: Song[];
  artists?: Artist[];
}

/** Max results per category (albums / tracks / artists). Must stay within backend caps. */
const SEARCH_LIMIT = 100;

function mergeMusicResults<T extends { id: number }>(
  local: T[] | undefined,
  fill: T[] | undefined,
): T[] {
  const loc = local ?? [];
  const seen = new Set(loc.map(x => x.id));
  const remaining = SEARCH_LIMIT - loc.length;
  if (remaining <= 0) return loc;
  const add: T[] = [];
  for (const x of fill ?? []) {
    if (add.length >= remaining) break;
    if (!seen.has(x.id)) {
      seen.add(x.id);
      add.push(x);
    }
  }
  return [...loc, ...add];
}

function spotifyFillPath(query: string, local: SearchResults | undefined): string {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('type', 'album,track,artist');
  params.set('limit', String(SEARCH_LIMIT));

  const albums = local?.albums ?? [];
  const tracks = local?.tracks ?? [];
  const artists = local?.artists ?? [];

  if (albums.length) {
    params.set('exclude_album_ids', albums.map(a => a.id).join(','));
  }
  if (tracks.length) {
    params.set('exclude_track_ids', tracks.map(t => t.id).join(','));
  }
  if (artists.length) {
    params.set('exclude_artist_ids', artists.map(a => a.id).join(','));
  }

  const albumSpotify = albums.map(a => a.spotify_id).filter(Boolean) as string[];
  const trackSpotify = tracks.map(t => t.spotify_id).filter(Boolean) as string[];
  const artistSpotify = artists.map(a => a.spotify_id).filter(Boolean) as string[];

  if (albumSpotify.length) {
    params.set('exclude_album_spotify_ids', albumSpotify.join(','));
  }
  if (trackSpotify.length) {
    params.set('exclude_track_spotify_ids', trackSpotify.join(','));
  }
  if (artistSpotify.length) {
    params.set('exclude_artist_spotify_ids', artistSpotify.join(','));
  }

  return `/api/v1/music/search/spotify-fill/?${params.toString()}`;
}

/**
 * Local catalog search first, then Spotify fill for gaps (same merged shape as legacy search).
 */
export function useSearch(query: string) {
  const q = query.trim();
  const enabled = q.length >= 2;

  const localQuery = useQuery({
    queryKey: ['search-local', q],
    queryFn: () =>
      apiFetch<SearchResults>(
        `/api/v1/music/search/local/?q=${encodeURIComponent(q)}&type=album,track,artist&limit=${SEARCH_LIMIT}`,
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const localData = localQuery.data;
  const needsFill =
    enabled &&
    localQuery.isSuccess &&
    ((localData?.albums?.length ?? 0) < SEARCH_LIMIT ||
      (localData?.tracks?.length ?? 0) < SEARCH_LIMIT ||
      (localData?.artists?.length ?? 0) < SEARCH_LIMIT);

  const fillQuery = useQuery({
    queryKey: ['search-spotify-fill', q, localData],
    queryFn: () => apiFetch<SearchResults>(spotifyFillPath(q, localData)),
    enabled: enabled && localQuery.isSuccess && needsFill,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const merged = useMemo(
    () => ({
      albums: mergeMusicResults(localData?.albums, fillQuery.data?.albums),
      tracks: mergeMusicResults(localData?.tracks, fillQuery.data?.tracks),
      artists: mergeMusicResults(localData?.artists, fillQuery.data?.artists),
    }),
    [localData, fillQuery.data],
  );

  const isMusicSettled =
    !enabled ||
    (!localQuery.isFetching && (!needsFill || !fillQuery.isFetching));

  const isFetchingSpotifyFill = Boolean(needsFill && fillQuery.isFetching);

  const isMusicInitialLoading =
    enabled && localQuery.isPending && !localQuery.isPlaceholderData;

  const data: SearchResults | undefined =
    !enabled ? undefined : localQuery.isPending && !localQuery.isPlaceholderData ? undefined : merged;

  return {
    data,
    isMusicSettled,
    isMusicInitialLoading,
    isFetchingSpotifyFill,
    localQuery,
    fillQuery,
  };
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: () =>
      apiFetch<User[]>(`/api/v1/auth/users/search/?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useListeningHistory(enabled = true) {
  return useQuery({
    queryKey: ['listening-history'],
    queryFn: () => apiFetch<PaginatedResponse<ListeningHistory>>('/api/v1/music/listening-history/'),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
