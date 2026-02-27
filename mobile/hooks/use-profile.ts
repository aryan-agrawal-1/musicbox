import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import type {
  User,
  Follow,
  AlbumRating,
  SongRating,
  AlbumReview,
  SongReview,
  FeedActivity,
  PaginatedResponse,
} from '@/types/api';

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => apiFetch<User>(`/api/v1/auth/users/${username}/`),
    staleTime: 5 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useUserActivity(username: string) {
  return useInfiniteQuery({
    queryKey: ['user-activity', username],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedResponse<FeedActivity>>(
        `/api/v1/social/feed/?username=${username}&page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useUserRatings(username: string) {
  return useInfiniteQuery({
    queryKey: ['user-ratings', username],
    queryFn: async ({ pageParam }) => {
      const [albumRatings, songRatings] = await Promise.all([
        apiFetch<PaginatedResponse<AlbumRating>>(
          `/api/v1/reviews/albums/ratings/?username=${username}&page=${pageParam}`
        ),
        apiFetch<PaginatedResponse<SongRating>>(
          `/api/v1/reviews/songs/ratings/?username=${username}&page=${pageParam}`
        ),
      ]);

      const results = [...albumRatings.results, ...songRatings.results].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        count: albumRatings.count + songRatings.count,
        next: albumRatings.next || songRatings.next,
        previous: albumRatings.previous || songRatings.previous,
        results,
      } as PaginatedResponse<AlbumRating | SongRating>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useUserReviews(username: string) {
  return useInfiniteQuery({
    queryKey: ['user-reviews', username],
    queryFn: async ({ pageParam }) => {
      const [albumReviews, songReviews] = await Promise.all([
        apiFetch<PaginatedResponse<AlbumReview>>(
          `/api/v1/reviews/albums/reviews/?username=${username}&page=${pageParam}`
        ),
        apiFetch<PaginatedResponse<SongReview>>(
          `/api/v1/reviews/songs/reviews/?username=${username}&page=${pageParam}`
        ),
      ]);

      const results = [...albumReviews.results, ...songReviews.results].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        count: albumReviews.count + songReviews.count,
        next: albumReviews.next || songReviews.next,
        previous: albumReviews.previous || songReviews.previous,
        results,
      } as PaginatedResponse<AlbumReview | SongReview>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useIsFollowing(username: string) {
  return useQuery({
    queryKey: ['is-following', username],
    queryFn: () =>
      apiFetch<{ is_following: boolean }>(
        `/api/v1/social/users/${username}/is-following/`
      ),
    staleTime: 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useFollowersList(username: string) {
  return useInfiniteQuery({
    queryKey: ['followers', username],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedResponse<Follow>>(
        `/api/v1/social/users/${username}/followers/?page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useFollowingList(username: string) {
  return useInfiniteQuery({
    queryKey: ['following-list', username],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedResponse<Follow>>(
        `/api/v1/social/users/${username}/following/?page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: number; username: string }) =>
      apiFetch('/api/v1/social/follow/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    onMutate: async ({ username }) => {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await queryClient.cancelQueries({ queryKey: ['is-following', username] });
      const previous = queryClient.getQueryData<{ is_following: boolean }>(['is-following', username]);
      queryClient.setQueryData(['is-following', username], { is_following: true });
      return { previous, username };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['is-following', context.username], context.previous);
      }
    },
    onSettled: (_data, _err, { username }) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', username] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUnfollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: number; username: string }) =>
      apiFetch(`/api/v1/social/unfollow/${userId}/`, {
        method: 'DELETE',
      }),
    onMutate: async ({ username }) => {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await queryClient.cancelQueries({ queryKey: ['is-following', username] });
      const previous = queryClient.getQueryData<{ is_following: boolean }>(['is-following', username]);
      queryClient.setQueryData(['is-following', username], { is_following: false });
      return { previous, username };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['is-following', context.username], context.previous);
      }
    },
    onSettled: (_data, _err, { username }) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', username] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
