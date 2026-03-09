import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Album, Song, Artist, User, ListeningHistory, PaginatedResponse } from '@/types/api';

export interface SearchResults {
  albums?: Album[];
  tracks?: Song[];
  artists?: Artist[];
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

export function useListeningHistory(enabled = true) {
  return useQuery({
    queryKey: ['listening-history'],
    queryFn: () => apiFetch<PaginatedResponse<ListeningHistory>>('/api/v1/music/listening-history/'),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
