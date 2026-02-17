from rest_framework import status, generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
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
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from .serializers import UserSerializer, UserRegistrationSerializer, UserProfileSerializer

User = get_user_model()


def encode_state(user_id):
    """Encode user ID into state parameter for OAuth"""
    data = {
        'user_id': user_id,
        'random': secrets.token_urlsafe(16)
    }
    json_str = json.dumps(data)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return encoded


def decode_state(state):
    """Decode state parameter to get user ID"""
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        data = json.loads(decoded)
        return data.get('user_id')
    except Exception:
        return None


# User Registration and Profile Views

class UserRegistrationView(generics.CreateAPIView):
    """Register a new user"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get and update current user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class UserProfileView(generics.RetrieveAPIView):
    """Get user profile by username"""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = 'username'


# Spotify OAuth Views

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
    # Encode user ID in state parameter to avoid session dependency
    state = encode_state(request.user.id)

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

    if error:
        return redirect(f"{settings.FRONTEND_URL}/settings?spotify=error&message={error}")

    if not state:
        return redirect(f"{settings.FRONTEND_URL}/settings?spotify=error&message=missing_state")

    # Decode user ID from state parameter
    user_id = decode_state(state)
    if not user_id:
        return redirect(f"{settings.FRONTEND_URL}/settings?spotify=error&message=invalid_state")

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return redirect(f"{settings.FRONTEND_URL}/settings?spotify=error&message=user_not_found")

    auth_manager = SpotifyOAuth(
        client_id=settings.SPOTIFY_CLIENT_ID,
        client_secret=settings.SPOTIFY_CLIENT_SECRET,
        redirect_uri=settings.SPOTIFY_REDIRECT_URI,
    )

    try:
        token_info = auth_manager.get_access_token(code, check_cache=False)
    except Exception as e:
        return redirect(f"{settings.FRONTEND_URL}/settings?spotify=error&message=token_error")

    # Get user info from Spotify
    spotify_client = spotipy.Spotify(auth=token_info['access_token'])
    user_info = spotify_client.current_user()

    # Update user with Spotify credentials
    user.spotify_user_id = user_info['id']
    user.spotify_access_token = token_info['access_token']
    user.spotify_refresh_token = token_info['refresh_token']
    user.spotify_token_expires_at = timezone.now() + timedelta(seconds=token_info['expires_in'])
    user.spotify_connected_at = timezone.now()
    user.save()

    # Redirect to frontend
    return redirect(f"{settings.FRONTEND_URL}/settings?spotify=connected")


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
