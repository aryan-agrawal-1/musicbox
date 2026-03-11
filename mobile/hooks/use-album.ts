import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Album, AlbumReview, AlbumRating, PaginatedResponse } from '@/types/api';

export function useAlbum(id: number | string) {
  return useQuery({
    queryKey: ['album', id],
    queryFn: () => apiFetch<Album>(`/api/v1/music/albums/${id}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

export function useAlbumReviews(id: number | string) {
  return useQuery({
    queryKey: ['album', id, 'reviews'],
    queryFn: () =>
      apiFetch<PaginatedResponse<AlbumReview>>(
        `/api/v1/reviews/albums/reviews/?album=${id}&limit=3`
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useUserAlbumRating(id: number | string) {
  return useQuery({
    queryKey: ['album', id, 'my-rating'],
    queryFn: async () => {
      try {
        const data = await apiFetch<PaginatedResponse<AlbumRating>>(
          `/api/v1/reviews/albums/ratings/?album=${id}&user=me`
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

export function useUserAlbumReview(id: number | string) {
  return useQuery({
    queryKey: ['album', id, 'my-review'],
    queryFn: async () => {
      try {
        const data = await apiFetch<PaginatedResponse<AlbumReview>>(
          `/api/v1/reviews/albums/reviews/?album=${id}&user=me`
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
