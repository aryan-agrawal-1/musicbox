from rest_framework import serializers
from django.contrib.auth import get_user_model
from notifications.models import DeviceToken, Notification

User = get_user_model()


class ActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar_url']
        read_only_fields = ['id', 'username', 'avatar_url']


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    actor = ActorSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'actor', 'notification_type', 'data', 'is_read', 'created_at']
        read_only_fields = ['id', 'actor', 'notification_type', 'data', 'created_at']
