from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Follow(models.Model):
    """Directional follow relationship between users"""

    follower = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='followers', on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'follows'
        unique_together = [['follower', 'following']]
        indexes = [
            models.Index(fields=['follower', '-created_at']),
            models.Index(fields=['following', '-created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(follower=models.F('following')),
                name='prevent_self_follow'
            )
        ]

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class FeedActivity(models.Model):
    """Generic activity for social feed using ContentTypes"""

    ACTIVITY_TYPES = [
        ('album_rating', 'Album Rating'),
        ('song_rating', 'Song Rating'),
        ('album_review', 'Album Review'),
        ('song_review', 'Song Review'),
        ('follow', 'Follow'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='activities', on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)

    # Generic relation to activity object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'feed_activities'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['content_type', 'object_id']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} at {self.created_at}"
