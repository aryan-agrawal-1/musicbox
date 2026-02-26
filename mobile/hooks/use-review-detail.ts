import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  AlbumReview,
  SongReview,
  AlbumReviewComment,
  PaginatedResponse,
} from '@/types/api';

type ReviewType = 'album' | 'song';

function reviewBase(type: ReviewType) {
  return type === 'album'
    ? '/api/v1/reviews/albums/reviews'
    : '/api/v1/reviews/songs/reviews';
}

function commentBase(type: ReviewType) {
  return type === 'album'
    ? '/api/v1/reviews/albums/reviews/comments'
    : '/api/v1/reviews/songs/reviews/comments';
}

// ─── Review detail ───────────────────────────────────────────────────────────

export function useReviewDetail(id: string, type: ReviewType) {
  return useQuery({
    queryKey: ['review', id, type],
    queryFn: () => apiFetch<AlbumReview | SongReview>(`${reviewBase(type)}/${id}/`),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });
}

// ─── Comments (paginated, top-level only) ────────────────────────────────────

export function useReviewComments(reviewId: string, type: ReviewType) {
  return useInfiniteQuery({
    queryKey: ['review-comments', reviewId, type],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<PaginatedResponse<AlbumReviewComment>>(
        `${commentBase(type)}/?review=${reviewId}&parent=null&page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (last, allPages) =>
      last.next ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!reviewId,
  });
}

// ─── Replies for a single comment ────────────────────────────────────────────

export function useCommentReplies(commentId: number, type: ReviewType, enabled: boolean) {
  return useQuery({
    queryKey: ['comment-replies', commentId, type],
    queryFn: () =>
      apiFetch<PaginatedResponse<AlbumReviewComment>>(
        `${commentBase(type)}/?parent=${commentId}`
      ),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

// ─── More reviews from same user ─────────────────────────────────────────────

export function useMoreFromUser(username: string, excludeId: string, type: ReviewType) {
  return useQuery({
    queryKey: ['more-from-user', username, type],
    queryFn: () =>
      apiFetch<PaginatedResponse<AlbumReview | SongReview>>(
        `${reviewBase(type)}/?username=${username}&limit=4`
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
    select: (data) => ({
      ...data,
      results: data.results.filter((r) => String(r.id) !== excludeId).slice(0, 3),
    }),
  });
}

// ─── Like / unlike review ────────────────────────────────────────────────────

export function useToggleReviewLike(reviewId: string, type: ReviewType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ liked }: { liked: boolean }) => {
      const url = `${reviewBase(type)}/${reviewId}/like/`;
      return apiFetch<void>(url, { method: liked ? 'DELETE' : 'POST' });
    },
    onMutate: async ({ liked }) => {
      await queryClient.cancelQueries({ queryKey: ['review', reviewId, type] });
      const previous = queryClient.getQueryData<AlbumReview | SongReview>(['review', reviewId, type]);
      if (previous) {
        queryClient.setQueryData<AlbumReview | SongReview>(['review', reviewId, type], {
          ...previous,
          is_liked: !liked,
          likes_count: previous.likes_count + (liked ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['review', reviewId, type], context.previous);
      }
    },
  });
}

// ─── Like / unlike comment ───────────────────────────────────────────────────

export function useToggleCommentLike(reviewId: string, type: ReviewType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: number; liked: boolean }) => {
      const url = `${commentBase(type)}/${commentId}/like/`;
      return apiFetch<void>(url, { method: liked ? 'DELETE' : 'POST' });
    },
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['review-comments', reviewId, type] });

      const previous = queryClient.getQueryData(['review-comments', reviewId, type]);

      queryClient.setQueriesData(
        { queryKey: ['review-comments', reviewId, type] },
        (old: { pages: { results: AlbumReviewComment[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results.map((c) =>
                c.id === commentId
                  ? { ...c, is_liked: !liked, likes_count: c.likes_count + (liked ? -1 : 1) }
                  : c
              ),
            })),
          };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['review-comments', reviewId, type], context.previous);
      }
    },
  });
}

// ─── Post comment ─────────────────────────────────────────────────────────────

export function usePostComment(reviewId: string, type: ReviewType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      apiFetch<AlbumReviewComment>(`${commentBase(type)}/`, {
        method: 'POST',
        body: JSON.stringify({
          review: Number(reviewId),
          content,
          ...(parentId != null ? { parent: parentId } : {}),
        }),
      }),
    onSuccess: (_data, { parentId }) => {
      if (parentId != null) {
        queryClient.invalidateQueries({ queryKey: ['comment-replies', parentId, type] });
      }
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId, type] });
      queryClient.invalidateQueries({ queryKey: ['review', reviewId, type] });
    },
  });
}
