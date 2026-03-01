from django.contrib import admin
from notifications.models import DeviceToken, Notification


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'token', 'created_at']
    raw_id_fields = ['user']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'actor', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    raw_id_fields = ['recipient', 'actor']
