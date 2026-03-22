from rest_framework import status, generics, serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .apple_auth import verify_apple_identity_token, AppleTokenError
from django.db.models import Q, Count
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from django.http import HttpResponse
from django.shortcuts import redirect
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import secrets
import json
import base64
import uuid
import boto3
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .password_reset_service import (
    send_password_reset_email,
    blacklist_refresh_tokens_for_user,
)

User = get_user_model()


class AuthRateThrottle(AnonRateThrottle):
    rate = '10/minute'


class PasswordResetRequestThrottle(ScopedRateThrottle):
    scope = 'password_reset_request'


class PasswordResetConfirmThrottle(ScopedRateThrottle):
    scope = 'password_reset_confirm'


def encode_state(user_id, redirect_scheme=None):
    """Encode user ID and optional redirect scheme into state parameter for OAuth"""
    data = {
        'user_id': user_id,
        'random': secrets.token_urlsafe(16),
    }
    if redirect_scheme:
        data['redirect_scheme'] = redirect_scheme
    json_str = json.dumps(data)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return encoded


def decode_state(state):
    """Decode state parameter to get user ID and optional redirect scheme"""
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        data = json.loads(decoded)
        return data.get('user_id'), data.get('redirect_scheme')
    except Exception:
        return None, None


# User Registration and Profile Views

class UserRegistrationView(generics.CreateAPIView):
    """Register a new user"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    serializer_class = UserRegistrationSerializer


class CurrentUserView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, and delete current user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        old_avatar_url = self.get_object().avatar_url
        response = super().update(request, *args, **kwargs)
        new_avatar_url = self.get_object().avatar_url
        if old_avatar_url and old_avatar_url != new_avatar_url:
            _delete_r2_avatar(old_avatar_url)
        return response

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        avatar_url = user.avatar_url
        user.delete()
        _delete_r2_avatar(avatar_url)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthRateThrottle])
def change_password(request):
    """Change the authenticated user's password"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    return Response({'message': 'Password changed successfully'})


@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    """Check whether an email address is already registered"""
    email = request.GET.get('email', '').strip().lower()
    if not email:
        return Response({'available': False})
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({'available': not exists})


GENERIC_PASSWORD_RESET_REQUEST_MSG = (
    "If an account exists for this email, you will receive a password reset link shortly."
)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRequestThrottle])
def password_reset_request(request):
    """
    Request a password reset email. Response is identical whether or not the email exists
    (enumeration-resistant). Apple-only accounts (no usable password) do not receive an email.
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']

    user = User.objects.filter(email__iexact=email).first()
    if user and user.is_active and user.has_usable_password():
        try:
            send_password_reset_email(user)
        except Exception:
            # Do not leak email/provider failures to the client
            if settings.DEBUG:
                raise
            pass

    return Response({'detail': GENERIC_PASSWORD_RESET_REQUEST_MSG})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmThrottle])
def password_reset_confirm(request):
    """Set a new password using uid + token from the reset email."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    new_password = serializer.validated_data['new_password']

    user.set_password(new_password)
    user.save(update_fields=['password'])

    blacklist_refresh_tokens_for_user(user)

    return Response({'detail': 'Your password has been reset. You can sign in with your new password.'})


class UserProfileView(generics.RetrieveAPIView):
    """Get user profile by username"""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = 'username'


class PopularUsersView(generics.ListAPIView):
    """Users ranked by follower count then activity."""
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            User.objects
            .annotate(follower_count=Count('followers'))
            .order_by('-follower_count', '-total_albums_rated')[:10]
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class UserSearchView(generics.ListAPIView):
    """Search users by username or name"""
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        q = self.request.GET.get('q', '').strip()
        if len(q) < 2:
            return User.objects.none()
        return User.objects.filter(
            Q(username__icontains=q) |
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q)
        )[:10]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Avatar Upload Views

_ALLOWED_AVATAR_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/heic'}
_EXT_MAP = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic'}


def _get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name='auto',
    )


def _delete_r2_avatar(avatar_url):
    """Delete an avatar object from R2. Silently ignores errors."""
    if not avatar_url or not settings.R2_PUBLIC_URL:
        return
    prefix = settings.R2_PUBLIC_URL.rstrip('/')
    if not avatar_url.startswith(prefix + '/'):
        return
    key = avatar_url[len(prefix) + 1:]
    try:
        _get_r2_client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    except Exception:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_avatar_upload_url(request):
    """Return a presigned PUT URL for uploading a profile picture directly to R2."""
    content_type = request.data.get('content_type', 'image/jpeg')
    if content_type not in _ALLOWED_AVATAR_TYPES:
        return Response({'error': 'Unsupported file type.'}, status=status.HTTP_400_BAD_REQUEST)

    ext = _EXT_MAP[content_type]
    key = f"avatars/{request.user.id}/{uuid.uuid4()}.{ext}"

    upload_url = _get_r2_client().generate_presigned_url(
        'put_object',
        Params={'Bucket': settings.R2_BUCKET_NAME, 'Key': key, 'ContentType': content_type},
        ExpiresIn=300,
    )
    public_url = f"{settings.R2_PUBLIC_URL}/{key}"

    return Response({'upload_url': upload_url, 'public_url': public_url})


# Spotify OAuth Views

_ALLOWED_REDIRECT_SCHEMES = {'muze', 'muzedebug', 'exp+musicbox'}


@extend_schema(
    responses={
        200: inline_serializer(
            name='SpotifyConnectResponse',
            fields={'auth_url': serializers.URLField()}
        )
    },
    description="Initiate Spotify OAuth flow and get authorization URL"
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spotify_connect(request):
    """Initiate Spotify OAuth flow"""
    redirect_scheme = request.GET.get('redirect_scheme')
    if redirect_scheme not in _ALLOWED_REDIRECT_SCHEMES:
        redirect_scheme = None
    state = encode_state(request.user.id, redirect_scheme=redirect_scheme)

    auth_manager = SpotifyOAuth(
        client_id=settings.SPOTIFY_CLIENT_ID,
        client_secret=settings.SPOTIFY_CLIENT_SECRET,
        redirect_uri=settings.SPOTIFY_REDIRECT_URI,
        state=state,
        scope='user-read-recently-played user-read-playback-state user-top-read',
        show_dialog=True,
    )

    auth_url = auth_manager.get_authorize_url()
    return Response({'auth_url': auth_url})


@extend_schema(
    exclude=True  # Exclude from schema as this is a redirect endpoint
)
@api_view(['GET'])
@permission_classes([AllowAny])  # Callback doesn't need auth - state parameter handles security
def spotify_callback(request):
    """Handle Spotify OAuth callback"""
    code = request.GET.get('code')
    state = request.GET.get('state')
    error = request.GET.get('error')

    user_id, redirect_scheme = decode_state(state) if state else (None, None)

    def build_redirect(path, params):
        if redirect_scheme:
            response = HttpResponse(status=302)
            response["Location"] = f"{redirect_scheme}://spotify-callback?{params}"
            return response
        return redirect(f"{settings.FRONTEND_URL}{path}?{params}")

    if error:
        return build_redirect('/settings', f'spotify=error&message={error}')

    if not state:
        return build_redirect('/settings', 'spotify=error&message=missing_state')

    if not user_id:
        return build_redirect('/settings', 'spotify=error&message=invalid_state')

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return build_redirect('/settings', 'spotify=error&message=user_not_found')

    auth_manager = SpotifyOAuth(
        client_id=settings.SPOTIFY_CLIENT_ID,
        client_secret=settings.SPOTIFY_CLIENT_SECRET,
        redirect_uri=settings.SPOTIFY_REDIRECT_URI,
    )

    try:
        token_info = auth_manager.get_access_token(code, check_cache=False)
    except Exception:
        return build_redirect('/settings', 'spotify=error&message=token_error')

    spotify_client = spotipy.Spotify(auth=token_info['access_token'])
    user_info = spotify_client.current_user()

    user.spotify_user_id = user_info['id']
    user.spotify_access_token = token_info['access_token']
    user.spotify_refresh_token = token_info['refresh_token']
    user.spotify_token_expires_at = timezone.now() + timedelta(seconds=token_info['expires_in'])
    user.spotify_connected_at = timezone.now()
    user.save()

    return build_redirect('/settings', 'spotify=connected')


@extend_schema(
    responses={
        200: inline_serializer(
            name='SpotifyDisconnectResponse',
            fields={'message': serializers.CharField()}
        )
    },
    description="Disconnect Spotify account from user profile"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def spotify_disconnect(request):
    """Disconnect Spotify account"""
    user = request.user
    user.spotify_user_id = None
    user.spotify_access_token = None
    user.spotify_refresh_token = None
    user.spotify_token_expires_at = None
    user.spotify_connected_at = None
    user.save()

    return Response({'message': 'Spotify disconnected successfully'})


@extend_schema(
    responses={
        200: inline_serializer(
            name='SpotifyStatusResponse',
            fields={
                'connected': serializers.BooleanField(),
                'spotify_user_id': serializers.CharField(allow_null=True),
                'connected_at': serializers.DateTimeField(allow_null=True)
            }
        )
    },
    description="Check if user has connected Spotify account"
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spotify_status(request):
    """Check Spotify connection status"""
    user = request.user
    return Response({
        'connected': user.is_spotify_connected,
        'spotify_user_id': user.spotify_user_id,
        'connected_at': user.spotify_connected_at,
    })


class AppleSignInView(generics.GenericAPIView):
    """
    POST /api/v1/auth/apple/

    Body: { identity_token, email?, full_name?: { givenName, familyName } }

    Returns (existing user): { access, refresh }
    Returns (new user):      { is_new_user: true, apple_uid, email, full_name }
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        identity_token = request.data.get("identity_token", "").strip()
        if not identity_token:
            return Response({"detail": "identity_token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = verify_apple_identity_token(identity_token)
        except AppleTokenError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        apple_uid = claims["sub"]
        token_email = claims.get("email") or request.data.get("email", "")
        full_name = request.data.get("full_name") or {}

        # Returning Apple user
        try:
            user = User.objects.get(apple_user_id=apple_uid)
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            })
        except User.DoesNotExist:
            pass

        # Email collision: link Apple ID to an existing account with the same email
        if token_email:
            existing = User.objects.filter(email__iexact=token_email).first()
            if existing:
                existing.apple_user_id = apple_uid
                existing.save(update_fields=["apple_user_id"])
                refresh = RefreshToken.for_user(existing)
                return Response({
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                })

        # Genuinely new user — must pick a username
        return Response({
            "is_new_user": True,
            "apple_uid": apple_uid,
            "email": token_email,
            "full_name": full_name,
        })


class AppleRegisterView(generics.GenericAPIView):
    """
    POST /api/v1/auth/apple/register/

    Body: { identity_token, username, email?, full_name?: { givenName, familyName } }
    Returns: { access, refresh }
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        import re
        from django.db import IntegrityError

        identity_token = request.data.get("identity_token", "").strip()
        if not identity_token:
            return Response({"detail": "identity_token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = verify_apple_identity_token(identity_token)
        except AppleTokenError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        apple_uid = claims["sub"]
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        full_name = request.data.get("full_name") or {}

        # Race condition guard: already registered between sign-in and register calls
        existing = User.objects.filter(apple_user_id=apple_uid).first()
        if existing:
            refresh = RefreshToken.for_user(existing)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_201_CREATED)

        if not username or not re.match(r'^[a-zA-Z0-9_]{3,30}$', username):
            return Response(
                {"detail": "Valid username required (3-30 chars, letters/numbers/underscores)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username__iexact=username).exists():
            return Response({"username": ["This username is already taken."]}, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=username,
            email=email,
            first_name=(full_name.get("givenName") or "").strip(),
            last_name=(full_name.get("familyName") or "").strip(),
            apple_user_id=apple_uid,
        )
        user.set_unusable_password()
        try:
            user.save()
        except IntegrityError:
            # Another concurrent request won the race on apple_user_id unique constraint
            user = User.objects.get(apple_user_id=apple_uid)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Apple Music endpoints
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apple_music_developer_token(request):
    """Return a short-lived Apple Music developer token (JWT).
    The private key stays server-side; the token is safe to send to clients.
    """
    from music.services.apple_music_service import AppleMusicService
    try:
        token = AppleMusicService().generate_developer_token()
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'token': token})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apple_music_connect(request):
    """Store the user's Apple Music user token received from the iOS MusicKit SDK."""
    user_token = request.data.get('user_token', '').strip()
    if not user_token:
        return Response({'error': 'user_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.apple_music_user_token = user_token
    user.apple_music_connected_at = timezone.now()
    user.save(update_fields=['apple_music_user_token', 'apple_music_connected_at'])

    return Response(UserProfileSerializer(user, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apple_music_disconnect(request):
    """Remove the stored Apple Music user token."""
    user = request.user
    user.apple_music_user_token = None
    user.apple_music_connected_at = None
    user.save(update_fields=['apple_music_user_token', 'apple_music_connected_at'])
    return Response({'message': 'Apple Music disconnected.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apple_music_status(request):
    """Check Apple Music connection status."""
    user = request.user
    return Response({
        'is_connected': user.is_apple_music_connected,
        'connected_at': user.apple_music_connected_at,
    })
