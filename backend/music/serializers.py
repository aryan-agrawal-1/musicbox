from rest_framework import serializers
from music.models import Artist, Album, Song, ListeningHistory


class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = ['id', 'spotify_id', 'name', 'image_url', 'genres']


class SongSerializer(serializers.ModelSerializer):
    artists = ArtistSerializer(many=True, read_only=True)
    album_name = serializers.CharField(source='album.name', read_only=True)
    album_image = serializers.URLField(source='album.image_url', read_only=True)
    album_spotify_id = serializers.CharField(source='album.spotify_id', read_only=True)
    avg_rating = serializers.FloatField(allow_null=True, read_only=True)

    class Meta:
        model = Song
        fields = [
            'id', 'spotify_id', 'name', 'artists',
            'album_name', 'album_image', 'album_spotify_id',
            'track_number', 'disc_number', 'duration_ms',
            'explicit', 'preview_url', 'avg_rating', 'total_ratings',
        ]


class AlbumSerializer(serializers.ModelSerializer):
    artists = ArtistSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(allow_null=True, read_only=True)
    popularity_score = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            'id', 'spotify_id', 'name', 'artists', 'album_type',
            'release_date', 'total_tracks', 'image_url', 'genres',
            'avg_rating', 'total_ratings', 'popularity_score',
        ]

    def get_popularity_score(self, obj):
        """Simple site-calculated popularity: weighted combination of ratings count and avg."""
        if not obj.total_ratings:
            return 0
        avg = float(obj.avg_rating or 0)
        return round(avg * obj.total_ratings, 2)


class AlbumDetailSerializer(serializers.ModelSerializer):
    artists = ArtistSerializer(many=True, read_only=True)
    songs = SongSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(allow_null=True, read_only=True)
    popularity_score = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            'id', 'spotify_id', 'name', 'artists', 'album_type',
            'release_date', 'total_tracks', 'image_url', 'genres',
            'avg_rating', 'total_ratings', 'popularity_score', 'songs',
        ]

    def get_popularity_score(self, obj):
        if not obj.total_ratings:
            return 0
        avg = float(obj.avg_rating or 0)
        return round(avg * obj.total_ratings, 2)


class ListeningHistorySerializer(serializers.ModelSerializer):
    song = SongSerializer(read_only=True)

    class Meta:
        model = ListeningHistory
        fields = ['id', 'song', 'played_at', 'context_type']
