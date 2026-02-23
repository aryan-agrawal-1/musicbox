import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { ArtistDetail } from '@/types/api';

export function useArtist(spotifyId: string) {
  return useQuery({
    queryKey: ['artist', spotifyId],
    queryFn: () => apiFetch<ArtistDetail>(`/api/v1/music/artists/${spotifyId}/`),
    staleTime: 10 * 60 * 1000,
    enabled: !!spotifyId,
  });
}
