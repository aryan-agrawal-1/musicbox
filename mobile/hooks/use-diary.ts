import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ListeningHistory, PaginatedResponse } from '@/types/api';

export function useDiary() {
  return useInfiniteQuery({
    queryKey: ['diary'],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedResponse<ListeningHistory>>(
        `/api/v1/music/listening-history/?page=${pageParam}`
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSyncListeningHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>('/api/v1/music/listening-history/sync/', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      queryClient.invalidateQueries({ queryKey: ['listening-history'] });
    },
  });
}
