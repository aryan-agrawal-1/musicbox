import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { ArtistDetail } from '@/types/api';

export function useArtist(id: number | string) {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: () => apiFetch<ArtistDetail>(`/api/v1/music/artists/${id}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}
