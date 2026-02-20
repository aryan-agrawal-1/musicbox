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
)

urlpatterns = [
    path('search/', SearchView.as_view(), name='music-search'),
    path('albums/', AlbumListView.as_view(), name='album-list'),
    path('albums/<str:spotify_id>/', AlbumDetailView.as_view(), name='album-detail'),
    path('songs/<str:spotify_id>/', SongDetailView.as_view(), name='song-detail'),
    path('artists/popular/', PopularArtistsView.as_view(), name='popular-artists'),
    path('artists/<str:spotify_id>/', ArtistDetailView.as_view(), name='artist-detail'),
    path('listening-history/', ListeningHistoryView.as_view(), name='listening-history'),
    path('listening-history/sync/', SyncListeningHistoryView.as_view(), name='listening-history-sync'),
]
