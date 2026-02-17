from django.contrib import admin
from social.models import Follow, FeedActivity


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'following', 'created_at']
    search_fields = ['follower__username', 'following__username']
    list_filter = ['created_at']
    readonly_fields = ['created_at']


@admin.register(FeedActivity)
class FeedActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'created_at']
    search_fields = ['user__username']
    list_filter = ['activity_type', 'created_at']
    readonly_fields = ['created_at']
