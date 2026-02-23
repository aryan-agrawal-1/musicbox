import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Album, AlbumReview, AlbumRating, PaginatedResponse } from '@/types/api';

export function useAlbum(spotifyId: string) {
  return useQuery({
    queryKey: ['album', spotifyId],
    queryFn: () => apiFetch<Album>(`/api/v1/music/albums/${spotifyId}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!spotifyId,
  });
}

export function useAlbumReviews(spotifyId: string) {
  return useQuery({
    queryKey: ['album', spotifyId, 'reviews'],
    queryFn: () =>
      apiFetch<PaginatedResponse<AlbumReview>>(
        `/api/v1/reviews/albums/reviews/?album=${spotifyId}&limit=3`
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!spotifyId,
  });
}

export function useUserAlbumRating(spotifyId: string) {
  return useQuery({
    queryKey: ['album', spotifyId, 'my-rating'],
    queryFn: async () => {
      try {
        const data = await apiFetch<PaginatedResponse<AlbumRating>>(
          `/api/v1/reviews/albums/ratings/?album=${spotifyId}&user=me`
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
