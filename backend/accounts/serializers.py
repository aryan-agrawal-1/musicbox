from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from datetime import timedelta
from drf_spectacular.utils import extend_schema_field

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    is_apple_music_connected = serializers.BooleanField(read_only=True)
    spotify_petition_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'avatar_url', 'location',
            'total_albums_rated', 'total_songs_rated', 'total_reviews',
            'spotify_user_id', 'spotify_connected_at',
            'is_apple_music_connected', 'apple_music_connected_at',
            'spotify_petition_signed', 'spotify_petition_count',
            'created_at'
        ]
        read_only_fields = [
            'id', 'total_albums_rated', 'total_songs_rated', 'total_reviews',
            'spotify_user_id', 'spotify_connected_at',
            'is_apple_music_connected', 'apple_music_connected_at',
            'created_at'
        ]

    @extend_schema_field(serializers.IntegerField)
    def get_spotify_petition_count(self, obj) -> int:
        return User.objects.filter(spotify_petition_signed=True).count()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profiles"""

    is_spotify_connected = serializers.BooleanField(read_only=True)
    is_apple_music_connected = serializers.BooleanField(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    total_likes_received = serializers.SerializerMethodField()
    spotify_petition_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'avatar_url', 'location',
            'total_albums_rated', 'total_songs_rated', 'total_reviews',
            'is_spotify_connected', 'spotify_user_id', 'spotify_connected_at',
            'is_apple_music_connected', 'apple_music_connected_at',
            'followers_count', 'following_count', 'total_likes_received',
            'spotify_petition_signed', 'spotify_petition_count',
            'created_at', 'username_last_changed'
        ]
        read_only_fields = [
            'id', 'total_albums_rated', 'total_songs_rated', 'total_reviews',
            'spotify_user_id', 'spotify_connected_at', 'created_at',
            'is_spotify_connected', 'is_apple_music_connected',
            'apple_music_connected_at',
            'followers_count', 'following_count', 'total_likes_received',
            'username_last_changed'
        ]

    @extend_schema_field(serializers.IntegerField)
    def get_followers_count(self, obj) -> int:
        return obj.followers.count()

    @extend_schema_field(serializers.IntegerField)
    def get_following_count(self, obj) -> int:
        return obj.following.count()

    @extend_schema_field(serializers.IntegerField)
    def get_total_likes_received(self, obj) -> int:
        from reviews.models import AlbumReviewLike, SongReviewLike
        album_likes = AlbumReviewLike.objects.filter(review__user=obj).count()
        song_likes = SongReviewLike.objects.filter(review__user=obj).count()
        return album_likes + song_likes

    @extend_schema_field(serializers.IntegerField)
    def get_spotify_petition_count(self, obj) -> int:
        return User.objects.filter(spotify_petition_signed=True).count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Only expose email to the profile owner
        if not request or not request.user.is_authenticated or request.user.pk != instance.pk:
            data.pop('email', None)
        return data

    def validate_username(self, value):
        instance = self.instance
        if instance and value != instance.username:
            if instance.username_last_changed:
                next_allowed = instance.username_last_changed + timedelta(days=30)
                if timezone.now() < next_allowed:
                    next_date = next_allowed.strftime('%B %-d, %Y')
                    raise serializers.ValidationError(
                        f"You can next change your username on {next_date}."
                    )
        return value

    def update(self, instance, validated_data):
        new_username = validated_data.get('username')
        if new_username and new_username != instance.username:
            validated_data['username_last_changed'] = timezone.now()
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change requiring current password verification"""

    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Passwords don't match."})
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a password reset email (email only)."""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm reset with uid, token, and new password."""

    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords don't match."}
            )

        uid_b64 = data['uid'].strip()
        token = data['token'].strip()

        try:
            pk = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError(
                {"token": ["This reset link is invalid or has expired."]}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"token": ["This reset link is invalid or has expired."]}
            )

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError(
                {"token": ["This reset link is invalid or has expired."]}
            )

        # Apple-only accounts: unusable password + linked Apple ID
        if not user.has_usable_password() and user.apple_user_id:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "This account uses Sign in with Apple and does not have a password. "
                        "Please sign in with Apple instead."
                    )
                },
                code="apple_sign_in_required",
            )

        data["user"] = user
        return data
