from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from music.models import Album, Song


class AlbumRating(models.Model):
    """Album rating by user (0.5-5.0 scale)"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='album_ratings', on_delete=models.CASCADE)
    album = models.ForeignKey(Album, related_name='ratings', on_delete=models.CASCADE)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(Decimal('0.5')), MaxValueValidator(Decimal('5.0'))]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'album_ratings'
        unique_together = [['user', 'album']]
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['album', '-rating']),
        ]

    def __str__(self):
        return f"{self.user.username} rated {self.album.name} - {self.rating}/5"


class SongRating(models.Model):
    """Song rating by user (0.5-5.0 scale)"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='song_ratings', on_delete=models.CASCADE)
    song = models.ForeignKey(Song, related_name='ratings', on_delete=models.CASCADE)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(Decimal('0.5')), MaxValueValidator(Decimal('5.0'))]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'song_ratings'
        unique_together = [['user', 'song']]
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['song', '-rating']),
        ]

    def __str__(self):
        return f"{self.user.username} rated {self.song.name} - {self.rating}/5"


class AlbumReview(models.Model):
    """Text review for an album"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='album_reviews', on_delete=models.CASCADE)
    album = models.ForeignKey(Album, related_name='reviews', on_delete=models.CASCADE)
    rating = models.ForeignKey(AlbumRating, related_name='review', on_delete=models.CASCADE, null=True, blank=True)

    content = models.TextField()
    likes_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'album_reviews'
        unique_together = [['user', 'album']]
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['album', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s review of {self.album.name}"


class SongReview(models.Model):
    """Text review for a song"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='song_reviews', on_delete=models.CASCADE)
    song = models.ForeignKey(Song, related_name='reviews', on_delete=models.CASCADE)
    rating = models.ForeignKey(SongRating, related_name='review', on_delete=models.CASCADE, null=True, blank=True)

    content = models.TextField()
    likes_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'song_reviews'
        unique_together = [['user', 'song']]
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['song', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s review of {self.song.name}"
