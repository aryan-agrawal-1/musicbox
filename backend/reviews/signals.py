from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from reviews.models import AlbumRating, SongRating, AlbumReview, SongReview
from social.models import FeedActivity


@receiver(post_save, sender=AlbumRating)
def update_album_rating_on_save(sender, instance, created, **kwargs):
    """Update album's aggregate rating when a rating is created or updated"""
    album = instance.album
    ratings = album.ratings.all()
    album.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    album.total_ratings = ratings.count()
    album.save(update_fields=['avg_rating', 'total_ratings'])

    # Create feed activity only on creation
    if created:
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='album_rating',
            content_object=instance
        )


@receiver(post_delete, sender=AlbumRating)
def update_album_rating_on_delete(sender, instance, **kwargs):
    """Update album's aggregate rating when a rating is deleted"""
    album = instance.album
    ratings = album.ratings.all()
    album.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    album.total_ratings = ratings.count()
    album.save(update_fields=['avg_rating', 'total_ratings'])


@receiver(post_save, sender=SongRating)
def update_song_rating_on_save(sender, instance, created, **kwargs):
    """Update song's aggregate rating when a rating is created or updated"""
    song = instance.song
    ratings = song.ratings.all()
    song.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    song.total_ratings = ratings.count()
    song.save(update_fields=['avg_rating', 'total_ratings'])

    # Create feed activity only on creation
    if created:
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='song_rating',
            content_object=instance
        )


@receiver(post_delete, sender=SongRating)
def update_song_rating_on_delete(sender, instance, **kwargs):
    """Update song's aggregate rating when a rating is deleted"""
    song = instance.song
    ratings = song.ratings.all()
    song.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    song.total_ratings = ratings.count()
    song.save(update_fields=['avg_rating', 'total_ratings'])


@receiver(post_save, sender=AlbumReview)
def create_album_review_activity(sender, instance, created, **kwargs):
    """Create feed activity when album review is created"""
    if created:
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='album_review',
            content_object=instance
        )


@receiver(post_save, sender=SongReview)
def create_song_review_activity(sender, instance, created, **kwargs):
    """Create feed activity when song review is created"""
    if created:
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='song_review',
            content_object=instance
        )
