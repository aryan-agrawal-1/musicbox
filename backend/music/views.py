from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import OrderingFilter
from django.db.models import ExpressionWrapper, F, FloatField
from django.db.models.functions import Coalesce

from music.models import Artist, Album, Song, ListeningHistory
from music.serializers import (
    ArtistSerializer, AlbumSerializer, AlbumDetailSerializer,
    SongSerializer, ListeningHistorySerializer,
)
from music.services.spotify_service import SpotifyService


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


class SearchView(APIView):
    """Search for albums, songs, and artists via Spotify"""
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get('type', 'album,track,artist')
        types = [t.strip() for t in types_param.split(',')]
        # Spotify API (Feb 2026) caps search limit at 10
        limit = min(int(request.query_params.get('limit', 10)), 10)
        offset = int(request.query_params.get('offset', 0))

        service = SpotifyService()
        results = service.search(query, types=types, limit=limit, offset=offset)

        response = {}
        if 'albums' in results:
            response['albums'] = results['albums']['items']
        if 'tracks' in results:
            response['tracks'] = results['tracks']['items']
        if 'artists' in results:
            response['artists'] = results['artists']['items']

        return Response(response)


class AlbumDetailView(APIView):
    """Get album details, fetching from Spotify and caching if not in DB"""
    permission_classes = [AllowAny]

    def get(self, request, spotify_id):
        try:
            album = Album.objects.prefetch_related('artists', 'songs', 'songs__artists').get(spotify_id=spotify_id)
        except Album.DoesNotExist:
            service = SpotifyService()
            try:
                album = service.get_or_create_album(spotify_id)
                album = Album.objects.prefetch_related('artists', 'songs', 'songs__artists').get(pk=album.pk)
            except Exception:
                return Response({'error': 'Album not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(AlbumDetailSerializer(album).data)


class SongDetailView(APIView):
    """Get song details, fetching from Spotify and caching if not in DB"""
    permission_classes = [AllowAny]

    def get(self, request, spotify_id):
        try:
            song = Song.objects.select_related('album').prefetch_related('artists').get(spotify_id=spotify_id)
        except Song.DoesNotExist:
            service = SpotifyService()
            try:
                track_data = service.get_track(spotify_id)
                service.get_or_create_album(track_data['album']['id'])
                song = Song.objects.select_related('album').prefetch_related('artists').get(spotify_id=spotify_id)
            except Exception:
                return Response({'error': 'Song not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(SongSerializer(song).data)


class ArtistDetailView(APIView):
    """Get artist details with their cached albums"""
    permission_classes = [AllowAny]

    def get(self, request, spotify_id):
        try:
            artist = Artist.objects.get(spotify_id=spotify_id)
        except Artist.DoesNotExist:
            service = SpotifyService()
            try:
                artist = service.get_or_create_artist(spotify_id)
            except Exception:
                return Response({'error': 'Artist not found.'}, status=status.HTTP_404_NOT_FOUND)

        albums = Album.objects.filter(artists=artist).prefetch_related('artists').order_by('-release_date')

        return Response({
            **ArtistSerializer(artist).data,
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
