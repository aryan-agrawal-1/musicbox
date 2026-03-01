from django.db import models
from django.conf import settings


class DeviceToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='device_tokens',
        on_delete=models.CASCADE,
    )
    token = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'device_tokens'
        indexes = [models.Index(fields=['user'])]

    def __str__(self):
        return f"{self.user.username} — {self.token[:30]}..."


class Notification(models.Model):
    TYPES = [
        ('new_follower', 'New Follower'),
        ('review_liked', 'Review Liked'),
        ('comment_on_review', 'Comment on Review'),
        ('reply_to_comment', 'Reply to Comment'),
        ('comment_liked', 'Comment Liked'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='notifications',
        on_delete=models.CASCADE,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='sent_notifications',
        on_delete=models.CASCADE,
    )
    notification_type = models.CharField(max_length=30, choices=TYPES)
    data = models.JSONField(default=dict)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.actor.username} → {self.recipient.username}: {self.notification_type}"
