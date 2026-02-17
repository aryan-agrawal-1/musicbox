from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for custom User model"""

    list_display = ['username', 'email', 'first_name', 'last_name', 'is_spotify_connected', 'created_at']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'created_at']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'spotify_user_id']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('bio', 'avatar_url', 'location')
        }),
        ('Spotify Integration', {
            'fields': ('spotify_user_id', 'spotify_connected_at')
        }),
        ('Stats', {
            'fields': ('total_albums_rated', 'total_songs_rated', 'total_reviews')
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'spotify_connected_at',
                      'total_albums_rated', 'total_songs_rated', 'total_reviews']
