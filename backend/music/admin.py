from django.contrib import admin
from music.models import Artist, Album, Song, ListeningHistory


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ['name', 'spotify_id', 'created_at']
    search_fields = ['name', 'spotify_id']
    list_filter = ['created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ['name', 'album_type', 'release_date', 'avg_rating', 'total_ratings', 'created_at']
    search_fields = ['name', 'spotify_id']
    list_filter = ['album_type', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'avg_rating', 'total_ratings']
    filter_horizontal = ['artists']


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ['name', 'album', 'track_number', 'avg_rating', 'total_ratings', 'created_at']
    search_fields = ['name', 'spotify_id']
    list_filter = ['explicit', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'avg_rating', 'total_ratings']
    filter_horizontal = ['artists']


@admin.register(ListeningHistory)
class ListeningHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'song', 'played_at', 'created_at']
    search_fields = ['user__username', 'song__name']
    list_filter = ['played_at', 'created_at']
    readonly_fields = ['created_at']
