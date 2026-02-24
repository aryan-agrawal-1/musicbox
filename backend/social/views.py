from rest_framework import status, generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from drf_spectacular.utils import extend_schema, inline_serializer
from social.models import Follow, FeedActivity
from social.serializers import FollowSerializer, FeedActivitySerializer

User = get_user_model()


@extend_schema(
    request=inline_serializer(
        name='FollowUserRequest',
        fields={'user_id': serializers.IntegerField()}
    ),
    responses={
        201: FollowSerializer,
        200: FollowSerializer,
        400: inline_serializer(
            name='FollowErrorResponse',
            fields={'error': serializers.CharField()}
        )
    },
    description="Follow another user"
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request):
    """Follow a user"""
    following_id = request.data.get('user_id')

    if not following_id:
        return Response(
            {'error': 'user_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    following = get_object_or_404(User, id=following_id)

    # Check if trying to follow self
    if following == request.user:
        return Response(
            {'error': 'Cannot follow yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create or get follow relationship
    follow, created = Follow.objects.get_or_create(
        follower=request.user,
        following=following
    )

    # Create feed activity if newly created
    if created:
        FeedActivity.objects.create(
            user=request.user,
            activity_type='follow',
            content_object=follow
        )

    return Response(
        FollowSerializer(follow).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@extend_schema(
    responses={
        204: None,
        404: inline_serializer(
            name='UnfollowErrorResponse',
            fields={'error': serializers.CharField()}
        )
    },
    description="Unfollow a user"
)
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user(request, user_id):
    """Unfollow a user"""
    following = get_object_or_404(User, id=user_id)

    deleted_count, _ = Follow.objects.filter(
        follower=request.user,
        following=following
    ).delete()

    if deleted_count:
        return Response(
            {'message': 'Successfully unfollowed user'},
            status=status.HTTP_204_NO_CONTENT
        )

    return Response(
        {'error': 'You are not following this user'},
        status=status.HTTP_404_NOT_FOUND
    )


class FeedView(generics.ListAPIView):
    """Get personalized feed from followed users"""

    serializer_class = FeedActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        username = self.request.query_params.get('username')

        # User profile activity tab: this user's activity + "someone followed you".
        if username:
            target_user = get_object_or_404(User, username=username)
            follow_ct = ContentType.objects.get_for_model(Follow)
            follow_ids = Follow.objects.filter(following=target_user).values_list('id', flat=True)
            return FeedActivity.objects.filter(
                Q(user=target_user)
                | Q(activity_type='follow', content_type=follow_ct, object_id__in=follow_ids)
            ).select_related(
                'user', 'content_type'
            ).prefetch_related(
                'content_object'
            ).order_by('-created_at')[:100]

        # Get IDs of users being followed
        following_ids = user.following.values_list('following_id', flat=True)

        # Get activities from followed users (and optionally own activities)
        return FeedActivity.objects.filter(
            user_id__in=following_ids
        ).select_related(
            'user', 'content_type'
        ).prefetch_related(
            'content_object'
        ).order_by('-created_at')[:100]  # Limit to 100 most recent items


@extend_schema(
    responses={200: inline_serializer(
        name='IsFollowingResponse',
        fields={'is_following': serializers.BooleanField()}
    )},
    description="Check if the authenticated user follows a given user"
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def is_following_user(request, username):
    """Check if current user is following the given user"""
    target = get_object_or_404(User, username=username)
    is_following = Follow.objects.filter(follower=request.user, following=target).exists()
    return Response({'is_following': is_following})


class UserFollowersView(generics.ListAPIView):
    """Get list of a user's followers"""

    serializer_class = FollowSerializer

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username=username)
        return Follow.objects.filter(following=user).select_related('follower', 'following')


class UserFollowingView(generics.ListAPIView):
    """Get list of users a user is following"""

    serializer_class = FollowSerializer

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username=username)
        return Follow.objects.filter(follower=user).select_related('follower', 'following')
