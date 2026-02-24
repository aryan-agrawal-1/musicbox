from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, F
from reviews.models import AlbumRating, SongRating, AlbumReview, SongReview, AlbumReviewLike, SongReviewLike
from social.models import FeedActivity


@receiver(post_save, sender=AlbumRating)
def update_album_rating_on_save(sender, instance, created, **kwargs):
    """Update album's aggregate rating when a rating is created or updated"""
    album = instance.album
    ratings = album.ratings.all()
    album.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    album.total_ratings = ratings.count()
    album.save(update_fields=['avg_rating', 'total_ratings'])

    if created:
        instance.user.__class__.objects.filter(pk=instance.user.pk).update(
            total_albums_rated=F('total_albums_rated') + 1
        )
        # Skip activity if a review already exists (review activity already shows the rating)
        if not AlbumReview.objects.filter(user=instance.user, album=instance.album).exists():
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

    instance.user.__class__.objects.filter(pk=instance.user.pk).update(
        total_albums_rated=F('total_albums_rated') - 1
    )


@receiver(post_save, sender=SongRating)
def update_song_rating_on_save(sender, instance, created, **kwargs):
    """Update song's aggregate rating when a rating is created or updated"""
    song = instance.song
    ratings = song.ratings.all()
    song.avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
    song.total_ratings = ratings.count()
    song.save(update_fields=['avg_rating', 'total_ratings'])

    if created:
        instance.user.__class__.objects.filter(pk=instance.user.pk).update(
            total_songs_rated=F('total_songs_rated') + 1
        )
        # Skip activity if a review already exists (review activity already shows the rating)
        if not SongReview.objects.filter(user=instance.user, song=instance.song).exists():
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

    instance.user.__class__.objects.filter(pk=instance.user.pk).update(
        total_songs_rated=F('total_songs_rated') - 1
    )


@receiver(post_save, sender=AlbumReview)
def create_album_review_activity(sender, instance, created, **kwargs):
    """Create feed activity when album review is created"""
    if created:
        instance.user.__class__.objects.filter(pk=instance.user.pk).update(
            total_reviews=F('total_reviews') + 1
        )
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='album_review',
            content_object=instance
        )


@receiver(post_delete, sender=AlbumReview)
def delete_album_review_activity(sender, instance, **kwargs):
    """Decrement user's review count when album review is deleted"""
    instance.user.__class__.objects.filter(pk=instance.user.pk).update(
        total_reviews=F('total_reviews') - 1
    )


@receiver(post_save, sender=SongReview)
def create_song_review_activity(sender, instance, created, **kwargs):
    """Create feed activity when song review is created"""
    if created:
        instance.user.__class__.objects.filter(pk=instance.user.pk).update(
            total_reviews=F('total_reviews') + 1
        )
        FeedActivity.objects.create(
            user=instance.user,
            activity_type='song_review',
            content_object=instance
        )


@receiver(post_delete, sender=SongReview)
def delete_song_review_activity(sender, instance, **kwargs):
    """Decrement user's review count when song review is deleted"""
    instance.user.__class__.objects.filter(pk=instance.user.pk).update(
        total_reviews=F('total_reviews') - 1
    )


@receiver(post_save, sender=AlbumReviewLike)
def increment_album_review_likes(sender, instance, created, **kwargs):
    if created:
        AlbumReview.objects.filter(pk=instance.review_id).update(likes_count=F('likes_count') + 1)


@receiver(post_delete, sender=AlbumReviewLike)
def decrement_album_review_likes(sender, instance, **kwargs):
    AlbumReview.objects.filter(pk=instance.review_id).update(likes_count=F('likes_count') - 1)


@receiver(post_save, sender=SongReviewLike)
def increment_song_review_likes(sender, instance, created, **kwargs):
    if created:
        SongReview.objects.filter(pk=instance.review_id).update(likes_count=F('likes_count') + 1)


@receiver(post_delete, sender=SongReviewLike)
def decrement_song_review_likes(sender, instance, **kwargs):
    SongReview.objects.filter(pk=instance.review_id).update(likes_count=F('likes_count') - 1)
