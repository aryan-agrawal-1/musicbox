from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import OrderingFilter
from django.db.models import ExpressionWrapper, F, FloatField, Sum
from django.db.models.functions import Coalesce

from music.models import Artist, Album, Song, ListeningHistory
from music.serializers import (
    ArtistSerializer, AlbumSerializer, AlbumDetailSerializer,
    SongSerializer, ListeningHistorySerializer,
)
from music.services.spotify_service import SpotifyService
from music.services.apple_music_service import AppleMusicService
from music.services.local_catalog_search import (
    search_albums_local,
    search_artists_local,
    search_songs_local,
)
from music.services.spotify_search_hydration import SpotifySearchHydrator

# Local DB: no Spotify cap. Spotify search: Feb 2026 caps GET /search `limit` at 10 per type per request
# (see https://developer.spotify.com/documentation/web-api/references/changes/february-2026).
_LOCAL_SEARCH_MAX_LIMIT = 100
_SPOTIFY_SEARCH_MAX_LIMIT = 10
_SPOTIFY_FILL_MAX_LIMIT = 100
# Paginate with limit=10 per call; enough pages to reach _SPOTIFY_FILL_MAX_LIMIT after exclusions.
_SPOTIFY_FILL_MAX_PAGES = 20


def _spotify_search_page_has_items(raw: dict, types: list[str]) -> bool:
    if 'album' in types and raw.get('albums', {}).get('items'):
        return True
    if 'track' in types and raw.get('tracks', {}).get('items'):
        return True
    if 'artist' in types and raw.get('artists', {}).get('items'):
        return True
    return False


class AlbumListView(ListAPIView):
    """List albums ordered by popularity or release date for feed discovery sections."""
    permission_classes = [AllowAny]
    serializer_class = AlbumSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ['release_date', 'popularity_score', 'total_ratings']
    ordering = ['-popularity_score']

    def get_queryset(self):
        return (
            Album.objects
            .prefetch_related('artists')
            .annotate(
                popularity_score=ExpressionWrapper(
                    Coalesce(F('avg_rating'), 0.0) * F('total_ratings'),
                    output_field=FloatField(),
                )
            )
        )


class PopularArtistsView(ListAPIView):
    """Artists ranked by aggregate popularity of their catalogued albums."""
    permission_classes = [AllowAny]
    serializer_class = ArtistSerializer

    def get_queryset(self):
        return (
            Artist.objects
            .annotate(
                album_score=Sum(
                    ExpressionWrapper(
                        Coalesce(F('albums__avg_rating'), 0.0) * F('albums__total_ratings'),
                        output_field=FloatField(),
                    )
                )
            )
            .filter(album_score__gt=0)
            .order_by('-album_score')[:10]
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SearchView(APIView):
    """
    Search via Spotify; return hydrated DB objects (integer IDs).

    Makes exactly ONE Spotify API call (the search itself) then uses bulk DB
    lookups + lightweight creates from the search-result payload so there are
    zero extra outbound Spotify calls per request.
    """
    permission_classes = [AllowAny]

    _VALID_SEARCH_TYPES = {'album', 'track', 'artist'}

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(query) > 200:
            return Response({'error': 'Query too long.'}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get('type', 'album,track,artist')
        types = [t.strip() for t in types_param.split(',') if t.strip() in self._VALID_SEARCH_TYPES]
        if not types:
            types = ['album', 'track', 'artist']

        try:
            limit = min(int(request.query_params.get('limit', 10)), _SPOTIFY_SEARCH_MAX_LIMIT)
            offset = int(request.query_params.get('offset', 0))
        except ValueError:
            return Response({'error': 'limit and offset must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        service = SpotifyService()
        hydrator = SpotifySearchHydrator(service)
        raw = service.search(query, types=types, limit=limit, offset=offset)

        response = {}
        if 'albums' in raw:
            response['albums'] = hydrator.hydrate_albums(raw['albums']['items'])
        if 'tracks' in raw:
            response['tracks'] = hydrator.hydrate_tracks(raw['tracks']['items'])
        if 'artists' in raw:
            response['artists'] = hydrator.hydrate_artists(raw['artists']['items'])

        return Response(response)


def _parse_int_id_set(request, param: str, *, max_len: int = 2000) -> set[int]:
    raw = request.query_params.get(param, '').strip()
    if len(raw) > max_len:
        return set()
    out: set[int] = set()
    for part in raw.split(','):
        part = part.strip()
        if not part:
            continue
        try:
            out.add(int(part))
        except ValueError:
            continue
    return out


def _parse_spotify_id_set(request, param: str, *, max_len: int = 4000) -> set[str]:
    raw = request.query_params.get(param, '').strip()
    if len(raw) > max_len:
        return set()
    return {p.strip() for p in raw.split(',') if p.strip()}


def _filter_search_rows(
    rows: list[dict],
    *,
    exclude_pks: set[int],
    exclude_spotify_ids: set[str],
) -> list[dict]:
    filtered = []
    for row in rows:
        pk = row.get('id')
        if pk in exclude_pks:
            continue
        sid = row.get('spotify_id')
        if sid and sid in exclude_spotify_ids:
            continue
        filtered.append(row)
    return filtered


class LocalSearchView(APIView):
    """Search the local catalog only (no Spotify). Same response keys as SearchView."""

    permission_classes = [AllowAny]
    _VALID_SEARCH_TYPES = {'album', 'track', 'artist'}

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(query) > 200:
            return Response({'error': 'Query too long.'}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get('type', 'album,track,artist')
        types = [t.strip() for t in types_param.split(',') if t.strip() in self._VALID_SEARCH_TYPES]
        if not types:
            types = ['album', 'track', 'artist']

        try:
            limit = min(int(request.query_params.get('limit', 10)), _LOCAL_SEARCH_MAX_LIMIT)
            offset = int(request.query_params.get('offset', 0))
        except ValueError:
            return Response({'error': 'limit and offset must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        response = {}
        if 'album' in types:
            albums = search_albums_local(query, limit=limit, offset=offset)
            response['albums'] = AlbumSerializer(albums, many=True).data
        if 'track' in types:
            songs = search_songs_local(query, limit=limit, offset=offset)
            response['tracks'] = SongSerializer(songs, many=True).data
        if 'artist' in types:
            artists = search_artists_local(query, limit=limit, offset=offset)
            response['artists'] = ArtistSerializer(artists, many=True).data

        return Response(response)


class SpotifyFillSearchView(APIView):
    """
    Spotify search + hydrate, then drop rows already represented by local results.

    Pass exclude_* query params (comma-separated) for PKs and optional Spotify IDs
    so merged UI can show local first without duplicates.
    """

    permission_classes = [AllowAny]
    _VALID_SEARCH_TYPES = {'album', 'track', 'artist'}

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(query) > 200:
            return Response({'error': 'Query too long.'}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get('type', 'album,track,artist')
        types = [t.strip() for t in types_param.split(',') if t.strip() in self._VALID_SEARCH_TYPES]
        if not types:
            types = ['album', 'track', 'artist']

        try:
            limit = min(int(request.query_params.get('limit', 10)), _SPOTIFY_FILL_MAX_LIMIT)
            initial_offset = int(request.query_params.get('offset', 0))
        except ValueError:
            return Response({'error': 'limit and offset must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        exclude_album_ids = _parse_int_id_set(request, 'exclude_album_ids')
        exclude_track_ids = _parse_int_id_set(request, 'exclude_track_ids')
        exclude_artist_ids = _parse_int_id_set(request, 'exclude_artist_ids')
        exclude_album_spotify_ids = _parse_spotify_id_set(request, 'exclude_album_spotify_ids')
        exclude_track_spotify_ids = _parse_spotify_id_set(request, 'exclude_track_spotify_ids')
        exclude_artist_spotify_ids = _parse_spotify_id_set(request, 'exclude_artist_spotify_ids')

        service = SpotifyService()
        hydrator = SpotifySearchHydrator(service)

        aggregated: dict[str, list] = {'albums': [], 'tracks': [], 'artists': []}
        spotify_offset = initial_offset

        for _ in range(_SPOTIFY_FILL_MAX_PAGES):
            need_album = 'album' in types and len(aggregated['albums']) < limit
            need_track = 'track' in types and len(aggregated['tracks']) < limit
            need_artist = 'artist' in types and len(aggregated['artists']) < limit
            if not (need_album or need_track or need_artist):
                break

            raw = service.search(
                query,
                types=types,
                limit=_SPOTIFY_SEARCH_MAX_LIMIT,
                offset=spotify_offset,
            )
            spotify_offset += _SPOTIFY_SEARCH_MAX_LIMIT

            if not _spotify_search_page_has_items(raw, types):
                break

            if 'albums' in raw and 'album' in types:
                rows = hydrator.hydrate_albums(raw['albums']['items'])
                filtered = _filter_search_rows(
                    rows,
                    exclude_pks=exclude_album_ids,
                    exclude_spotify_ids=exclude_album_spotify_ids,
                )
                for row in filtered:
                    if len(aggregated['albums']) >= limit:
                        break
                    aggregated['albums'].append(row)

            if 'tracks' in raw and 'track' in types:
                rows = hydrator.hydrate_tracks(raw['tracks']['items'])
                filtered = _filter_search_rows(
                    rows,
                    exclude_pks=exclude_track_ids,
                    exclude_spotify_ids=exclude_track_spotify_ids,
                )
                for row in filtered:
                    if len(aggregated['tracks']) >= limit:
                        break
                    aggregated['tracks'].append(row)

            if 'artists' in raw and 'artist' in types:
                rows = hydrator.hydrate_artists(raw['artists']['items'])
                filtered = _filter_search_rows(
                    rows,
                    exclude_pks=exclude_artist_ids,
                    exclude_spotify_ids=exclude_artist_spotify_ids,
                )
                for row in filtered:
                    if len(aggregated['artists']) >= limit:
                        break
                    aggregated['artists'].append(row)

        response = {}
        if 'album' in types:
            response['albums'] = aggregated['albums'][:limit]
        if 'track' in types:
            response['tracks'] = aggregated['tracks'][:limit]
        if 'artist' in types:
            response['artists'] = aggregated['artists'][:limit]

        return Response(response)


class AlbumDetailView(APIView):
    """Get album details by database pk"""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            album = Album.objects.prefetch_related('artists', 'songs', 'songs__artists').get(pk=pk)
        except Album.DoesNotExist:
            return Response({'error': 'Album not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(AlbumDetailSerializer(album).data)


class SongDetailView(APIView):
    """Get song details by database pk"""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            song = Song.objects.select_related('album').prefetch_related('artists').get(pk=pk)
        except Song.DoesNotExist:
            return Response({'error': 'Song not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(SongSerializer(song).data)


class ArtistDetailView(APIView):
    """Get artist details with their cached albums"""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            artist = Artist.objects.get(pk=pk)
        except Artist.DoesNotExist:
            return Response({'error': 'Artist not found.'}, status=status.HTTP_404_NOT_FOUND)

        albums = Album.objects.filter(artists=artist).prefetch_related('artists').order_by('-release_date')

        album_agg = Album.objects.filter(artists=artist).aggregate(
            weighted_sum=Coalesce(
                Sum(
                    ExpressionWrapper(
                        Coalesce(F('avg_rating'), 0.0) * F('total_ratings'),
                        output_field=FloatField(),
                    )
                ),
                0.0,
            ),
            ratings_count=Coalesce(Sum('total_ratings'), 0),
        )
        song_agg = Song.objects.filter(artists=artist).aggregate(
            weighted_sum=Coalesce(
                Sum(
                    ExpressionWrapper(
                        Coalesce(F('avg_rating'), 0.0) * F('total_ratings'),
                        output_field=FloatField(),
                    )
                ),
                0.0,
            ),
            ratings_count=Coalesce(Sum('total_ratings'), 0),
        )

        total_ratings = int(album_agg['ratings_count'] + song_agg['ratings_count'])
        weighted_sum = float(album_agg['weighted_sum'] + song_agg['weighted_sum'])
        avg_rating = round(weighted_sum / total_ratings, 2) if total_ratings > 0 else None

        return Response({
            **ArtistSerializer(artist).data,
            'avg_rating': avg_rating,
            'total_ratings': total_ratings,
            'albums': AlbumSerializer(albums, many=True).data,
        })


class ListeningHistoryView(ListAPIView):
    """Get the authenticated user's listening history"""
    permission_classes = [IsAuthenticated]
    serializer_class = ListeningHistorySerializer

    def get_queryset(self):
        return (
            ListeningHistory.objects
            .filter(user=self.request.user)
            .select_related('song', 'song__album')
            .prefetch_related('song__artists')
            .order_by('-played_at')[:200]
        )


class SyncListeningHistoryView(APIView):
    """Trigger a sync of the user's recent Spotify plays"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_spotify_connected:
            return Response(
                {'error': 'Spotify account not connected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = SpotifyService(user=user)
        try:
            service.sync_recently_played()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'status': 'Listening history synced.'})


class AppleMusicSyncView(APIView):
    """Sync the user's Apple Music recently played tracks into ListeningHistory"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_apple_music_connected:
            return Response(
                {'error': 'Apple Music not connected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        storefront = request.data.get('storefront', 'us')
        service = AppleMusicService()
        try:
            tracks = service.get_recently_played(user.apple_music_user_token, storefront=storefront)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            songs = service.sync_listening_history(user, tracks)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'synced': len(songs),
            'songs': SongSerializer(songs, many=True).data,
        })
