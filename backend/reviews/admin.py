from django.contrib import admin
from reviews.models import AlbumRating, SongRating, AlbumReview, SongReview


@admin.register(AlbumRating)
class AlbumRatingAdmin(admin.ModelAdmin):
    list_display = ['user', 'album', 'rating', 'created_at']
    search_fields = ['user__username', 'album__name']
    list_filter = ['rating', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SongRating)
class SongRatingAdmin(admin.ModelAdmin):
    list_display = ['user', 'song', 'rating', 'created_at']
    search_fields = ['user__username', 'song__name']
    list_filter = ['rating', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AlbumReview)
class AlbumReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'album', 'likes_count', 'created_at']
    search_fields = ['user__username', 'album__name', 'content']
    list_filter = ['created_at']
    readonly_fields = ['created_at', 'updated_at', 'likes_count']


@admin.register(SongReview)
class SongReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'song', 'likes_count', 'created_at']
    search_fields = ['user__username', 'song__name', 'content']
    list_filter = ['created_at']
    readonly_fields = ['created_at', 'updated_at', 'likes_count']
