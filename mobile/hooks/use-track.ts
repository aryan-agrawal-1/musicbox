import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Song, SongReview, SongRating, PaginatedResponse } from '@/types/api';

export function useTrack(id: number | string) {
  return useQuery({
    queryKey: ['track', id],
    queryFn: () => apiFetch<Song>(`/api/v1/music/songs/${id}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

export function useSongReviews(id: number | string) {
  return useQuery({
    queryKey: ['track', id, 'reviews'],
    queryFn: () =>
      apiFetch<PaginatedResponse<SongReview>>(
        `/api/v1/reviews/songs/reviews/?song=${id}&limit=3`
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useUserSongRating(id: number | string) {
  return useQuery({
    queryKey: ['track', id, 'my-rating'],
    queryFn: async () => {
      try {
        const data = await apiFetch<PaginatedResponse<SongRating>>(
          `/api/v1/reviews/songs/ratings/?song=${id}&user=me`
        );
        return data.results[0] ?? null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: 0,
    enabled: !!id,
  });
}
