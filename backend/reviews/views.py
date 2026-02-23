from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status
from reviews.models import AlbumRating, SongRating, AlbumReview, SongReview
from reviews.serializers import (
    AlbumRatingSerializer, SongRatingSerializer,
    AlbumReviewSerializer, SongReviewSerializer
)
from api.permissions import IsOwner


class AlbumRatingViewSet(viewsets.ModelViewSet):
    """ViewSet for album ratings (CRUD)"""

    serializer_class = AlbumRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            qs = AlbumRating.objects.select_related('user', 'album').all()
            album = self.request.query_params.get('album')
            user = self.request.query_params.get('user')
            if album:
                qs = qs.filter(album__spotify_id=album)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs
        return AlbumRating.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # Check if user owns this rating
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only update your own ratings")
        serializer.save()

    def perform_destroy(self, instance):
        # Check if user owns this rating
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own ratings")
        instance.delete()


class SongRatingViewSet(viewsets.ModelViewSet):
    """ViewSet for song ratings (CRUD)"""

    serializer_class = SongRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            qs = SongRating.objects.select_related('user', 'song', 'song__album').all()
            song = self.request.query_params.get('song')
            user = self.request.query_params.get('user')
            if song:
                qs = qs.filter(song__spotify_id=song)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs
        return SongRating.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only update your own ratings")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own ratings")
        instance.delete()


class AlbumReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for album reviews (CRUD)"""

    serializer_class = AlbumReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            qs = AlbumReview.objects.select_related('user', 'album', 'rating').all()
            album = self.request.query_params.get('album')
            user = self.request.query_params.get('user')
            if album:
                qs = qs.filter(album__spotify_id=album)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs
        return AlbumReview.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only update your own reviews")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own reviews")
        instance.delete()


class SongReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for song reviews (CRUD)"""

    serializer_class = SongReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            qs = SongReview.objects.select_related('user', 'song', 'song__album', 'rating').all()
            song = self.request.query_params.get('song')
            user = self.request.query_params.get('user')
            if song:
                qs = qs.filter(song__spotify_id=song)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs
        return SongReview.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only update your own reviews")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own reviews")
        instance.delete()
