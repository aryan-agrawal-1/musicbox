import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Song, SongReview, SongRating, PaginatedResponse } from '@/types/api';

export function useTrack(spotifyId: string) {
  return useQuery({
    queryKey: ['track', spotifyId],
    queryFn: () => apiFetch<Song>(`/api/v1/music/songs/${spotifyId}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!spotifyId,
  });
}

export function useSongReviews(spotifyId: string) {
  return useQuery({
    queryKey: ['track', spotifyId, 'reviews'],
    queryFn: () =>
      apiFetch<PaginatedResponse<SongReview>>(
        `/api/v1/reviews/songs/reviews/?song=${spotifyId}&limit=3`
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!spotifyId,
  });
}

export function useUserSongRating(spotifyId: string) {
  return useQuery({
    queryKey: ['track', spotifyId, 'my-rating'],
    queryFn: async () => {
      try {
        const data = await apiFetch<PaginatedResponse<SongRating>>(
          `/api/v1/reviews/songs/ratings/?song=${spotifyId}&user=me`
        );
        return data.results[0] ?? null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: 0,
    enabled: !!spotifyId,
  });
}
