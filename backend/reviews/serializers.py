from rest_framework import serializers
from reviews.models import AlbumRating, SongRating, AlbumReview, SongReview
from accounts.serializers import UserSerializer


class AlbumRatingSerializer(serializers.ModelSerializer):
    """Serializer for album ratings"""

    user = UserSerializer(read_only=True)
    album_name = serializers.CharField(source='album.name', read_only=True)
    album_image = serializers.URLField(source='album.image_url', read_only=True)
    album_spotify_id = serializers.CharField(source='album.spotify_id', read_only=True)

    class Meta:
        model = AlbumRating
        fields = [
            'id', 'user', 'album', 'album_name', 'album_image', 'album_spotify_id',
            'rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate_rating(self, value):
        """Ensure rating is in 0.5 increments"""
        if (value * 2) % 1 != 0:
            raise serializers.ValidationError("Rating must be in 0.5 increments (0.5, 1.0, 1.5, etc.)")
        return value


class SongRatingSerializer(serializers.ModelSerializer):
    """Serializer for song ratings"""

    user = UserSerializer(read_only=True)
    song_name = serializers.CharField(source='song.name', read_only=True)
    song_spotify_id = serializers.CharField(source='song.spotify_id', read_only=True)
    album_name = serializers.CharField(source='song.album.name', read_only=True)
    album_image = serializers.URLField(source='song.album.image_url', read_only=True)
    album_spotify_id = serializers.CharField(source='song.album.spotify_id', read_only=True)

    class Meta:
        model = SongRating
        fields = [
            'id', 'user', 'song', 'song_name', 'song_spotify_id', 'album_name', 'album_image',
            'album_spotify_id', 'rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate_rating(self, value):
        """Ensure rating is in 0.5 increments"""
        if (value * 2) % 1 != 0:
            raise serializers.ValidationError("Rating must be in 0.5 increments (0.5, 1.0, 1.5, etc.)")
        return value


class AlbumReviewSerializer(serializers.ModelSerializer):
    """Serializer for album reviews"""

    user = UserSerializer(read_only=True)
    album_name = serializers.CharField(source='album.name', read_only=True)
    album_image = serializers.URLField(source='album.image_url', read_only=True)
    album_spotify_id = serializers.CharField(source='album.spotify_id', read_only=True)
    rating_value = serializers.DecimalField(source='rating.rating', read_only=True, max_digits=2, decimal_places=1)

    class Meta:
        model = AlbumReview
        fields = [
            'id', 'user', 'album', 'album_name', 'album_image', 'album_spotify_id',
            'rating', 'rating_value', 'content', 'likes_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'likes_count', 'created_at', 'updated_at']


class SongReviewSerializer(serializers.ModelSerializer):
    """Serializer for song reviews"""

    user = UserSerializer(read_only=True)
    song_name = serializers.CharField(source='song.name', read_only=True)
    album_name = serializers.CharField(source='song.album.name', read_only=True)
    album_image = serializers.URLField(source='song.album.image_url', read_only=True)
    album_spotify_id = serializers.CharField(source='song.album.spotify_id', read_only=True)
    rating_value = serializers.DecimalField(source='rating.rating', read_only=True, max_digits=2, decimal_places=1)

    class Meta:
        model = SongReview
        fields = [
            'id', 'user', 'song', 'song_name', 'album_name', 'album_image', 'album_spotify_id',
            'rating', 'rating_value', 'content', 'likes_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'likes_count', 'created_at', 'updated_at']
