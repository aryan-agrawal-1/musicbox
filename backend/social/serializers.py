from rest_framework import serializers
from social.models import Follow, FeedActivity
from accounts.serializers import UserSerializer
from drf_spectacular.utils import extend_schema_field
from typing import Optional, Dict, Any


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for Follow relationships"""

    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'follower', 'created_at']


class FeedActivitySerializer(serializers.ModelSerializer):
    """Serializer for feed activities"""

    user = UserSerializer(read_only=True)
    activity_data = serializers.SerializerMethodField()

    class Meta:
        model = FeedActivity
        fields = ['id', 'user', 'activity_type', 'activity_data', 'created_at']
        read_only_fields = ['id', 'user', 'activity_type', 'activity_data', 'created_at']

    @extend_schema_field(serializers.DictField)
    def get_activity_data(self, obj) -> Optional[Dict[str, Any]]:
        """Serialize the related object based on activity type"""
        from reviews.serializers import (
            AlbumRatingSerializer, SongRatingSerializer,
            AlbumReviewSerializer, SongReviewSerializer
        )

        content_object = obj.content_object
        if not content_object:
            return None

        serializer_map = {
            'album_rating': AlbumRatingSerializer,
            'song_rating': SongRatingSerializer,
            'album_review': AlbumReviewSerializer,
            'song_review': SongReviewSerializer,
            'follow': FollowSerializer,
        }

        serializer_class = serializer_map.get(obj.activity_type)
        if serializer_class:
            return serializer_class(content_object).data
        return None
