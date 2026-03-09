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

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get('type', 'album,track,artist')
        types = [t.strip() for t in types_param.split(',')]
        limit = min(int(request.query_params.get('limit', 10)), 10)
        offset = int(request.query_params.get('offset', 0))

        service = SpotifyService()
        raw = service.search(query, types=types, limit=limit, offset=offset)

        response = {}
        if 'albums' in raw:
            response['albums'] = self._hydrate_albums(raw['albums']['items'])
        if 'tracks' in raw:
            response['tracks'] = self._hydrate_tracks(raw['tracks']['items'])
        if 'artists' in raw:
            response['artists'] = self._hydrate_artists(raw['artists']['items'])

        return Response(response)

    # ── private helpers ───────────────────────────────────────────────────────

    def _artist_from_data(self, data):
        """Get or create an Artist from Spotify data already in memory. No API call."""
        artist, _ = Artist.objects.get_or_create(
            spotify_id=data['id'],
            defaults={
                'name': data['name'],
                'image_url': (data.get('images') or [{}])[0].get('url'),
                'genres': data.get('genres', []),
            },
        )
        return artist

    def _album_from_data(self, data):
        """Get or create an Album from Spotify data already in memory. No API call."""
        album = Album.objects.filter(spotify_id=data['id']).first()
        if album:
            return album
        artists = [self._artist_from_data(a) for a in data.get('artists', [])]
        album = Album.objects.create(
            spotify_id=data['id'],
            name=data['name'],
            album_type=data.get('album_type', 'album'),
            release_date=data.get('release_date', ''),
            total_tracks=data.get('total_tracks', 0),
            image_url=(data.get('images') or [{}])[0].get('url'),
        )
        album.artists.set(artists)
        return album

    def _hydrate_albums(self, items):
        if not items:
            return []
        existing = {
            a.spotify_id: a
            for a in Album.objects.filter(
                spotify_id__in=[i['id'] for i in items]
            ).prefetch_related('artists')
        }
        results = []
        for item in items:
            try:
                album = existing.get(item['id'])
                if not album:
                    album = self._album_from_data(item)
                    album = Album.objects.prefetch_related('artists').get(pk=album.pk)
                results.append(AlbumSerializer(album).data)
            except Exception:
                pass
        return results

    def _hydrate_tracks(self, items):
        if not items:
            return []
        existing = {
            s.spotify_id: s
            for s in Song.objects.filter(
                spotify_id__in=[i['id'] for i in items]
            ).select_related('album').prefetch_related('artists')
        }
        results = []
        for item in items:
            try:
                song = existing.get(item['id'])
                if not song:
                    album = self._album_from_data(item['album'])
                    song, created = Song.objects.get_or_create(
                        spotify_id=item['id'],
                        defaults={
                            'name': item['name'],
                            'album': album,
                            'track_number': item.get('track_number', 0),
                            'disc_number': item.get('disc_number', 1),
                            'duration_ms': item.get('duration_ms', 0),
                            'explicit': item.get('explicit', False),
                            'preview_url': item.get('preview_url'),
                        },
                    )
                    if created:
                        song.artists.set([self._artist_from_data(a) for a in item.get('artists', [])])
                    song = Song.objects.select_related('album').prefetch_related('artists').get(pk=song.pk)
                results.append(SongSerializer(song).data)
            except Exception:
                pass
        return results

    def _hydrate_artists(self, items):
        if not items:
            return []
        existing = {
            a.spotify_id: a
            for a in Artist.objects.filter(spotify_id__in=[i['id'] for i in items])
        }
        results = []
        for item in items:
            try:
                artist = existing.get(item['id']) or self._artist_from_data(item)
                results.append(ArtistSerializer(artist).data)
            except Exception:
                pass
        return results


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
