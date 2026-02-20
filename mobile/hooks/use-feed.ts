import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Album, Artist, User, FeedActivity, PaginatedResponse } from '@/types/api';

export function usePopularAlbums() {
  return useQuery({
    queryKey: ['albums', 'popular'],
    queryFn: () =>
      apiFetch<PaginatedResponse<Album>>(
        '/api/v1/music/albums/?ordering=-popularity_score&limit=10'
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewReleases() {
  return useQuery({
    queryKey: ['albums', 'new-releases'],
    queryFn: () =>
      apiFetch<PaginatedResponse<Album>>(
        '/api/v1/music/albums/?ordering=-release_date&limit=10'
      ),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePopularArtists() {
  return useQuery({
    queryKey: ['artists', 'popular'],
    queryFn: () => apiFetch<Artist[]>('/api/v1/music/artists/popular/'),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePopularUsers() {
  return useQuery({
    queryKey: ['users', 'popular'],
    queryFn: () => apiFetch<User[]>('/api/v1/auth/users/popular/'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFriendFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedResponse<FeedActivity>>(
        `/api/v1/social/feed/?page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 60 * 1000,
  });
}
