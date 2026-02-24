import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { User, ListeningHistory, PaginatedResponse } from '@/types/api';

// Raw Spotify API shapes (what the backend search endpoint actually returns) ───

interface SpotifyImage {
  url: string;
  width?: number;
  height?: number;
}

interface SpotifyArtistSimple {
  id: string;
  name: string;
}

export interface SpotifyAlbumResult {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistSimple[];
}

export interface SpotifyTrackResult {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  track_number: number;
  disc_number: number;
  artists: SpotifyArtistSimple[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    artists: SpotifyArtistSimple[];
  };
}

export interface SpotifyArtistResult {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
}

export interface SearchResults {
  albums?: SpotifyAlbumResult[];
  tracks?: SpotifyTrackResult[];
  artists?: SpotifyArtistResult[];
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () =>
      apiFetch<SearchResults>(
        `/api/v1/music/search/?q=${encodeURIComponent(query)}&type=album,track,artist&limit=10`
      ),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
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

export function useListeningHistory() {
  return useQuery({
    queryKey: ['listening-history'],
    queryFn: () => apiFetch<PaginatedResponse<ListeningHistory>>('/api/v1/music/listening-history/'),
    staleTime: 2 * 60 * 1000,
  });
}
