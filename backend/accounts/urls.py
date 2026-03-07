from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # User registration and authentication
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('check-email/', views.check_email, name='check-email'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('change-password/', views.change_password, name='change-password'),
    path('users/popular/', views.PopularUsersView.as_view(), name='popular-users'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('users/<str:username>/', views.UserProfileView.as_view(), name='user-profile'),

    # Avatar upload
    path('avatar/upload-url/', views.get_avatar_upload_url, name='avatar-upload-url'),

    # Apple Sign In
    path('apple/', views.AppleSignInView.as_view(), name='apple-signin'),
    path('apple/register/', views.AppleRegisterView.as_view(), name='apple-register'),

    # Spotify OAuth
    path('spotify/connect/', views.spotify_connect, name='spotify-connect'),
    path('spotify/callback/', views.spotify_callback, name='spotify-callback'),
    path('spotify/disconnect/', views.spotify_disconnect, name='spotify-disconnect'),
    path('spotify/status/', views.spotify_status, name='spotify-status'),
]
