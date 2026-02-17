from django.db import models
from django.conf import settings


class Artist(models.Model):
    """Artist model with Spotify metadata"""

    spotify_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    image_url = models.URLField(blank=True, null=True)
    genres = models.JSONField(default=list)
    popularity = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'artists'
        indexes = [
            models.Index(fields=['spotify_id']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


class Album(models.Model):
    """Album model with Spotify metadata and denormalized ratings"""

    spotify_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    artists = models.ManyToManyField(Artist, related_name='albums')

    album_type = models.CharField(max_length=50)  # album, single, compilation
    release_date = models.CharField(max_length=50)
    total_tracks = models.IntegerField()
    image_url = models.URLField(blank=True, null=True)
    genres = models.JSONField(default=list)
    label = models.CharField(max_length=255, blank=True)

    # Denormalized ratings for performance
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_ratings = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'albums'
        indexes = [
            models.Index(fields=['spotify_id']),
            models.Index(fields=['name']),
            models.Index(fields=['-avg_rating']),
        ]

    def __str__(self):
        artist = self.artists.first()
        return f"{self.name} - {artist.name if artist else 'Unknown'}"


class Song(models.Model):
    """Song model with Spotify metadata and denormalized ratings"""

    spotify_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    album = models.ForeignKey(Album, related_name='songs', on_delete=models.CASCADE)
    artists = models.ManyToManyField(Artist, related_name='songs')

    track_number = models.IntegerField()
    disc_number = models.IntegerField(default=1)
    duration_ms = models.IntegerField()
    explicit = models.BooleanField(default=False)
    preview_url = models.URLField(blank=True, null=True)

    # Denormalized ratings for performance
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_ratings = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'songs'
        indexes = [
            models.Index(fields=['spotify_id']),
            models.Index(fields=['name']),
            models.Index(fields=['-avg_rating']),
        ]
        unique_together = [['album', 'track_number', 'disc_number']]

    def __str__(self):
        artist = self.artists.first()
        return f"{self.name} - {artist.name if artist else 'Unknown'}"


class ListeningHistory(models.Model):
    """User listening history from Spotify"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='listening_history', on_delete=models.CASCADE)
    song = models.ForeignKey(Song, related_name='plays', on_delete=models.CASCADE)
    album = models.ForeignKey(Album, related_name='plays', on_delete=models.CASCADE, null=True)

    played_at = models.DateTimeField(db_index=True)
    context_type = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'listening_history'
        indexes = [
            models.Index(fields=['user', '-played_at']),
            models.Index(fields=['song', '-played_at']),
            models.Index(fields=['-played_at']),
        ]
        ordering = ['-played_at']

    def __str__(self):
        return f"{self.user.username} played {self.song.name} at {self.played_at}"
