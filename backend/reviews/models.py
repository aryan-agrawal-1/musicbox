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
        ordering = ['-created_at']
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
        ordering = ['-created_at']
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


class AlbumReviewLike(models.Model):
    """Like on an album review"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='album_review_likes', on_delete=models.CASCADE)
    review = models.ForeignKey(AlbumReview, related_name='likes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'album_review_likes'
        unique_together = [['user', 'review']]

    def __str__(self):
        return f"{self.user.username} liked AlbumReview({self.review_id})"


class SongReviewLike(models.Model):
    """Like on a song review"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='song_review_likes', on_delete=models.CASCADE)
    review = models.ForeignKey(SongReview, related_name='likes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'song_review_likes'
        unique_together = [['user', 'review']]

    def __str__(self):
        return f"{self.user.username} liked SongReview({self.review_id})"


class AlbumReviewComment(models.Model):
    """Comment on an album review"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='album_review_comments', on_delete=models.CASCADE)
    review = models.ForeignKey(AlbumReview, related_name='comments', on_delete=models.CASCADE)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'album_review_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['review', 'created_at']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return f"{self.user.username} on AlbumReview({self.review_id})"


class SongReviewComment(models.Model):
    """Comment on a song review"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='song_review_comments', on_delete=models.CASCADE)
    review = models.ForeignKey(SongReview, related_name='comments', on_delete=models.CASCADE)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'song_review_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['review', 'created_at']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return f"{self.user.username} on SongReview({self.review_id})"


class AlbumReviewCommentLike(models.Model):
    """Like on an album review comment"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='album_review_comment_likes', on_delete=models.CASCADE)
    comment = models.ForeignKey(AlbumReviewComment, related_name='likes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'album_review_comment_likes'
        unique_together = [['user', 'comment']]

    def __str__(self):
        return f"{self.user.username} liked AlbumReviewComment({self.comment_id})"


class SongReviewCommentLike(models.Model):
    """Like on a song review comment"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='song_review_comment_likes', on_delete=models.CASCADE)
    comment = models.ForeignKey(SongReviewComment, related_name='likes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'song_review_comment_likes'
        unique_together = [['user', 'comment']]

    def __str__(self):
        return f"{self.user.username} liked SongReviewComment({self.comment_id})"
