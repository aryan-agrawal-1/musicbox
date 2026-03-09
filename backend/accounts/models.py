from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with Spotify integration and stats"""

    # Profile fields
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True)

    # Username change tracking
    username_last_changed = models.DateTimeField(null=True, blank=True)

    # Apple Sign In
    apple_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)

    # Spotify integration
    spotify_user_id = models.CharField(max_length=100, unique=True, null=True, blank=True, db_index=True)
    spotify_access_token = models.CharField(max_length=500, null=True, blank=True)
    spotify_refresh_token = models.CharField(max_length=500, null=True, blank=True)
    spotify_token_expires_at = models.DateTimeField(null=True, blank=True)
    spotify_connected_at = models.DateTimeField(null=True, blank=True)

    # Apple Music integration
    apple_music_user_token = models.CharField(max_length=2000, null=True, blank=True)
    apple_music_connected_at = models.DateTimeField(null=True, blank=True)

    # Denormalized stats for performance
    total_albums_rated = models.IntegerField(default=0)
    total_songs_rated = models.IntegerField(default=0)
    total_reviews = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['spotify_user_id']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.username

    @property
    def is_spotify_connected(self):
        """Check if user has connected Spotify account"""
        return bool(self.spotify_access_token)

    @property
    def is_apple_music_connected(self):
        """Check if user has connected Apple Music"""
        return bool(self.apple_music_user_token)
