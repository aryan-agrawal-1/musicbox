from django.db.models.signals import post_save
from django.dispatch import receiver

from social.models import Follow
from reviews.models import (
    AlbumReview, SongReview,
    AlbumReviewLike, SongReviewLike,
    AlbumReviewComment, SongReviewComment,
    AlbumReviewCommentLike, SongReviewCommentLike,
)
from notifications.models import Notification
from notifications.push import send_push_notification


# ── 1. new_follower ───────────────────────────────────────────────────────────

@receiver(post_save, sender=Follow)
def notify_new_follower(sender, instance, created, **kwargs):
    if not created:
        return
    recipient, actor = instance.following, instance.follower
    if recipient == actor:
        return
    data = {'type': 'new_follower', 'username': actor.username}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type='new_follower', data=data
    )
    send_push_notification(recipient, 'New Follower', f'@{actor.username} started following you', data)


# ── 2. review_liked ──────────────────────────────────────────────────────────

@receiver(post_save, sender=AlbumReviewLike)
def notify_album_review_liked(sender, instance, created, **kwargs):
    if not created:
        return
    review = AlbumReview.objects.select_related('user', 'album').get(pk=instance.review_id)
    recipient, actor = review.user, instance.user
    if recipient == actor:
        return
    data = {'type': 'review_liked', 'review_id': str(review.id), 'review_type': 'album'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type='review_liked', data=data
    )
    send_push_notification(
        recipient, 'Someone liked your review',
        f'@{actor.username} liked your review of {review.album.name}', data
    )


@receiver(post_save, sender=SongReviewLike)
def notify_song_review_liked(sender, instance, created, **kwargs):
    if not created:
        return
    review = SongReview.objects.select_related('user', 'song').get(pk=instance.review_id)
    recipient, actor = review.user, instance.user
    if recipient == actor:
        return
    data = {'type': 'review_liked', 'review_id': str(review.id), 'review_type': 'song'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type='review_liked', data=data
    )
    send_push_notification(
        recipient, 'Someone liked your review',
        f'@{actor.username} liked your review of {review.song.name}', data
    )


# ── 3. comment_on_review / 4. reply_to_comment ───────────────────────────────

@receiver(post_save, sender=AlbumReviewComment)
def notify_album_review_comment(sender, instance, created, **kwargs):
    if not created:
        return
    actor = instance.user
    if instance.parent_id:
        parent = AlbumReviewComment.objects.select_related('user').get(pk=instance.parent_id)
        recipient = parent.user
        if recipient == actor:
            return
        notif_type = 'reply_to_comment'
        body = f'@{actor.username} replied to your comment'
        data = {'type': 'reply_to_comment', 'review_id': str(instance.review_id), 'review_type': 'album'}
    else:
        review = AlbumReview.objects.select_related('user', 'album').get(pk=instance.review_id)
        recipient = review.user
        if recipient == actor:
            return
        notif_type = 'comment_on_review'
        body = f'@{actor.username} commented on your review of {review.album.name}'
        data = {'type': 'comment_on_review', 'review_id': str(review.id), 'review_type': 'album'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type=notif_type, data=data
    )
    send_push_notification(recipient, 'New comment', body, data)


@receiver(post_save, sender=SongReviewComment)
def notify_song_review_comment(sender, instance, created, **kwargs):
    if not created:
        return
    actor = instance.user
    if instance.parent_id:
        parent = SongReviewComment.objects.select_related('user').get(pk=instance.parent_id)
        recipient = parent.user
        if recipient == actor:
            return
        notif_type = 'reply_to_comment'
        body = f'@{actor.username} replied to your comment'
        data = {'type': 'reply_to_comment', 'review_id': str(instance.review_id), 'review_type': 'song'}
    else:
        review = SongReview.objects.select_related('user', 'song').get(pk=instance.review_id)
        recipient = review.user
        if recipient == actor:
            return
        notif_type = 'comment_on_review'
        body = f'@{actor.username} commented on your review of {review.song.name}'
        data = {'type': 'comment_on_review', 'review_id': str(review.id), 'review_type': 'song'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type=notif_type, data=data
    )
    send_push_notification(recipient, 'New comment', body, data)


# ── 5. comment_liked ─────────────────────────────────────────────────────────

@receiver(post_save, sender=AlbumReviewCommentLike)
def notify_album_comment_liked(sender, instance, created, **kwargs):
    if not created:
        return
    comment = AlbumReviewComment.objects.select_related('user', 'review__album').get(pk=instance.comment_id)
    recipient, actor = comment.user, instance.user
    if recipient == actor:
        return
    data = {'type': 'comment_liked', 'review_id': str(comment.review_id), 'review_type': 'album'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type='comment_liked', data=data
    )
    send_push_notification(
        recipient, 'Someone liked your comment',
        f'@{actor.username} liked your comment on {comment.review.album.name}', data
    )


@receiver(post_save, sender=SongReviewCommentLike)
def notify_song_comment_liked(sender, instance, created, **kwargs):
    if not created:
        return
    comment = SongReviewComment.objects.select_related('user', 'review__song').get(pk=instance.comment_id)
    recipient, actor = comment.user, instance.user
    if recipient == actor:
        return
    data = {'type': 'comment_liked', 'review_id': str(comment.review_id), 'review_type': 'song'}
    Notification.objects.create(
        recipient=recipient, actor=actor, notification_type='comment_liked', data=data
    )
    send_push_notification(
        recipient, 'Someone liked your comment',
        f'@{actor.username} liked your comment on {comment.review.song.name}', data
    )
