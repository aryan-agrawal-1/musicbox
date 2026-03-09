from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Exists, OuterRef
from reviews.models import (
    AlbumRating, SongRating, AlbumReview, SongReview,
    AlbumReviewLike, SongReviewLike,
    AlbumReviewComment, SongReviewComment,
    AlbumReviewCommentLike, SongReviewCommentLike,
)
from reviews.serializers import (
    AlbumRatingSerializer, SongRatingSerializer,
    AlbumReviewSerializer, SongReviewSerializer,
    AlbumReviewCommentSerializer, SongReviewCommentSerializer,
)
from api.permissions import IsOwner


def _get_user_filter(query_params):
    """Support both legacy `user` and frontend `username` query params."""
    return query_params.get('user') or query_params.get('username')


class AlbumRatingViewSet(viewsets.ModelViewSet):
    """ViewSet for album ratings (CRUD)"""

    serializer_class = AlbumRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            qs = AlbumRating.objects.select_related('user', 'album').all()
            album = self.request.query_params.get('album')
            user = _get_user_filter(self.request.query_params)
            if album:
                qs = qs.filter(album_id=album)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs.order_by('-created_at')
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
            user = _get_user_filter(self.request.query_params)
            if song:
                qs = qs.filter(song_id=song)
            if user == 'me':
                qs = qs.filter(user=self.request.user)
            elif user:
                qs = qs.filter(user__username=user)
            return qs.order_by('-created_at')
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
        user = self.request.user
        if self.action in ['list', 'retrieve']:
            qs = AlbumReview.objects.select_related('user', 'album', 'rating').annotate(
                is_liked=Exists(AlbumReviewLike.objects.filter(review=OuterRef('pk'), user=user))
            )
            album = self.request.query_params.get('album')
            filter_user = _get_user_filter(self.request.query_params)
            if album:
                qs = qs.filter(album_id=album)
            if filter_user == 'me':
                qs = qs.filter(user=user)
            elif filter_user:
                qs = qs.filter(user__username=filter_user)
            return qs.order_by('-created_at')
        if self.action in ['like', 'unlike']:
            return AlbumReview.objects.all()
        return AlbumReview.objects.filter(user=user)

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

    @action(detail=True, methods=['post', 'delete'], url_path='like')
    def like(self, request, pk=None):
        review = self.get_object()
        if request.method == 'POST':
            _, created = AlbumReviewLike.objects.get_or_create(user=request.user, review=review)
            return Response({'liked': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        deleted, _ = AlbumReviewLike.objects.filter(user=request.user, review=review).delete()
        if not deleted:
            return Response({'detail': 'Not liked.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SongReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for song reviews (CRUD)"""

    serializer_class = SongReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if self.action in ['list', 'retrieve']:
            qs = SongReview.objects.select_related('user', 'song', 'song__album', 'rating').annotate(
                is_liked=Exists(SongReviewLike.objects.filter(review=OuterRef('pk'), user=user))
            )
            song = self.request.query_params.get('song')
            filter_user = _get_user_filter(self.request.query_params)
            if song:
                qs = qs.filter(song_id=song)
            if filter_user == 'me':
                qs = qs.filter(user=user)
            elif filter_user:
                qs = qs.filter(user__username=filter_user)
            return qs.order_by('-created_at')
        if self.action in ['like', 'unlike']:
            return SongReview.objects.all()
        return SongReview.objects.filter(user=user)

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

    @action(detail=True, methods=['post', 'delete'], url_path='like')
    def like(self, request, pk=None):
        review = self.get_object()
        if request.method == 'POST':
            _, created = SongReviewLike.objects.get_or_create(user=request.user, review=review)
            return Response({'liked': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        deleted, _ = SongReviewLike.objects.filter(user=request.user, review=review).delete()
        if not deleted:
            return Response({'detail': 'Not liked.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlbumReviewCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for album review comments, replies, and likes"""

    serializer_class = AlbumReviewCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = AlbumReviewComment.objects.select_related('user', 'review').annotate(
            likes_count=Count('likes', distinct=True),
            replies_count=Count('replies', distinct=True),
            is_liked=Exists(
                AlbumReviewCommentLike.objects.filter(comment=OuterRef('pk'), user=user)
            ),
        )
        review_id = self.request.query_params.get('review')
        if review_id:
            qs = qs.filter(review_id=review_id)

        parent_param = self.request.query_params.get('parent')
        if parent_param == 'null':
            qs = qs.filter(parent__isnull=True)
        elif parent_param:
            qs = qs.filter(parent_id=parent_param)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own comments.")
        instance.delete()

    @action(detail=True, methods=['post', 'delete'], url_path='like')
    def like(self, request, pk=None):
        comment = self.get_object()
        if request.method == 'POST':
            _, created = AlbumReviewCommentLike.objects.get_or_create(user=request.user, comment=comment)
            return Response({'liked': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        deleted, _ = AlbumReviewCommentLike.objects.filter(user=request.user, comment=comment).delete()
        if not deleted:
            return Response({'detail': 'Not liked.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SongReviewCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for song review comments, replies, and likes"""

    serializer_class = SongReviewCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SongReviewComment.objects.select_related('user', 'review').annotate(
            likes_count=Count('likes', distinct=True),
            replies_count=Count('replies', distinct=True),
            is_liked=Exists(
                SongReviewCommentLike.objects.filter(comment=OuterRef('pk'), user=user)
            ),
        )
        review_id = self.request.query_params.get('review')
        if review_id:
            qs = qs.filter(review_id=review_id)

        parent_param = self.request.query_params.get('parent')
        if parent_param == 'null':
            qs = qs.filter(parent__isnull=True)
        elif parent_param:
            qs = qs.filter(parent_id=parent_param)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own comments.")
        instance.delete()

    @action(detail=True, methods=['post', 'delete'], url_path='like')
    def like(self, request, pk=None):
        comment = self.get_object()
        if request.method == 'POST':
            _, created = SongReviewCommentLike.objects.get_or_create(user=request.user, comment=comment)
            return Response({'liked': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        deleted, _ = SongReviewCommentLike.objects.filter(user=request.user, comment=comment).delete()
        if not deleted:
            return Response({'detail': 'Not liked.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
