from django.urls import path
from music.views import (
    SearchView,
    AlbumListView,
    AlbumDetailView,
    SongDetailView,
    ArtistDetailView,
    PopularArtistsView,
    ListeningHistoryView,
    SyncListeningHistoryView,
    AppleMusicSyncView,
)

urlpatterns = [
    path('search/', SearchView.as_view(), name='music-search'),
    path('albums/', AlbumListView.as_view(), name='album-list'),
    path('albums/<int:pk>/', AlbumDetailView.as_view(), name='album-detail'),
    path('songs/<int:pk>/', SongDetailView.as_view(), name='song-detail'),
    path('artists/popular/', PopularArtistsView.as_view(), name='popular-artists'),
    path('artists/<int:pk>/', ArtistDetailView.as_view(), name='artist-detail'),
    path('listening-history/', ListeningHistoryView.as_view(), name='listening-history'),
    path('listening-history/sync/', SyncListeningHistoryView.as_view(), name='listening-history-sync'),
    path('apple-music/sync/', AppleMusicSyncView.as_view(), name='apple-music-sync'),
]
