import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getAlbumsUrl() {
  const base = API_BASE_URL.replace(/\/+$/, '')
  // Default ordering in the backend is by popularity score.
  return `${base}/api/v1/music/albums/?page=1`
}

function normalizeAlbum(a) {
  if (!a) return null
  return {
    name: a.name ?? '',
    image_url: a.image_url ?? null,
  }
}

export function useFeaturedAlbum(count = 3) {
  const isPrerender = typeof globalThis !== 'undefined' && globalThis.__PRERENDER_INJECTED

  const query = useQuery({
    queryKey: ['featuredAlbums', count],
    enabled: !isPrerender,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch(getAlbumsUrl(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      })

      if (!res.ok) throw new Error(`Request failed: ${res.status}`)

      const data = await res.json()
      const pageResults = Array.isArray(data?.results) ? data.results : []

      // Keep the same “featured” behavior as before.
      const normalized = pageResults
        .slice(0, Math.max(1, count))
        .map(normalizeAlbum)
        .filter(Boolean)

      return normalized
    },
  })

  const albums = isPrerender ? [] : query.data ?? []
  const album = albums[0] ?? null

  const status = isPrerender ? 'loading' : query.isPending ? 'loading' : query.isError ? 'error' : 'success'
  const error = isPrerender
    ? null
    : query.error instanceof Error
      ? query.error.message
      : query.error
        ? String(query.error)
        : null

  return { album, albums, status, error }
}

