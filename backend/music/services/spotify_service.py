import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from music.models import Artist, Album, Song, ListeningHistory
from music.services.catalog_matcher import CatalogMatcher


class SpotifyService:
    """Service layer for Spotify API integration"""

    def __init__(self, user=None):
        """Initialize Spotify client with user or app credentials"""
        self.user = user
        self.matcher = CatalogMatcher()
        if user and user.spotify_access_token:
            self.client = self._get_user_client(user)
        else:
            self.client = self._get_app_client()

    def _get_app_client(self):
        """Get Spotify client using app credentials (for public data)"""
        auth_manager = SpotifyClientCredentials(
            client_id=settings.SPOTIFY_CLIENT_ID,
            client_secret=settings.SPOTIFY_CLIENT_SECRET
        )
        return spotipy.Spotify(auth_manager=auth_manager)

    def _get_user_client(self, user):
        """Get Spotify client using user's access token (for private data)"""
        # Check if token needs refresh
        if user.spotify_token_expires_at and timezone.now() >= user.spotify_token_expires_at:
            self._refresh_user_token(user)

        return spotipy.Spotify(auth=user.spotify_access_token)

    def _refresh_user_token(self, user):
        """Refresh user's Spotify access token"""
        auth_manager = SpotifyOAuth(
            client_id=settings.SPOTIFY_CLIENT_ID,
            client_secret=settings.SPOTIFY_CLIENT_SECRET,
            redirect_uri=settings.SPOTIFY_REDIRECT_URI,
        )

        token_info = auth_manager.refresh_access_token(user.spotify_refresh_token)

        user.spotify_access_token = token_info['access_token']
        user.spotify_token_expires_at = timezone.now() + timedelta(seconds=token_info['expires_in'])
        if 'refresh_token' in token_info:
            user.spotify_refresh_token = token_info['refresh_token']
        user.save()

    def get_or_create_artist(self, spotify_id):
        """Get artist from DB or fetch from Spotify API and create"""
        artist = Artist.objects.filter(spotify_id=spotify_id).first()
        if artist:
            return artist

        artist_data = self.client.artist(spotify_id)
        return self.get_or_create_artist_from_data(artist_data)

    def get_or_create_artist_from_data(self, artist_data):
        """Resolve an artist from Spotify payload already in memory."""
        return self.matcher.resolve_artist(
            spotify_id=artist_data.get('id'),
            name=artist_data.get('name'),
            image_url=(artist_data.get('images') or [{}])[0].get('url'),
            genres=artist_data.get('genres', []),
        )

    def get_or_create_album(self, spotify_id):
        """Get album from DB or fetch from Spotify API and create"""
        album = Album.objects.filter(spotify_id=spotify_id).first()
        if album:
            return album

        album_data = self.client.album(spotify_id)
        return self.get_or_create_album_from_data(
            album_data,
            tracks=album_data.get('tracks', {}).get('items', []),
        )

    def get_or_create_album_from_data(self, album_data, tracks=None):
        """Resolve an album from Spotify payload already in memory."""
        artists = [
            self.get_or_create_artist_from_data(artist_data)
            for artist_data in album_data.get('artists', [])
        ]
        album = self.matcher.resolve_album(
            spotify_id=album_data.get('id'),
            name=album_data.get('name'),
            artist_names=[artist_data.get('name') for artist_data in album_data.get('artists', [])],
            artists=artists,
            album_type=album_data.get('album_type', 'album'),
            release_date=album_data.get('release_date', ''),
            total_tracks=album_data.get('total_tracks', 0),
            image_url=(album_data.get('images') or [{}])[0].get('url'),
            genres=album_data.get('genres', []),
        )

        for track in tracks or []:
            self._create_song_from_track(track, album)

        return album

    def _create_song_from_track(self, track_data, album):
        """Create song from Spotify track data"""
        artists = [
            self.get_or_create_artist_from_data(artist_data)
            for artist_data in track_data.get('artists', [])
        ]
        song, _ = self.matcher.resolve_song(
            spotify_id=track_data.get('id'),
            name=track_data.get('name'),
            album=album,
            artist_names=[artist_data.get('name') for artist_data in track_data.get('artists', [])],
            artists=artists,
            track_number=track_data.get('track_number', 0),
            disc_number=track_data.get('disc_number', 1),
            duration_ms=track_data.get('duration_ms', 0),
            explicit=track_data.get('explicit', False),
            preview_url=track_data.get('preview_url'),
        )
        return song

    def sync_recently_played(self):
        """Sync user's recently played tracks from Spotify"""
        if not self.user:
            raise ValueError("User required for this operation")

        results = self.client.current_user_recently_played(limit=50)

        for item in results['items']:
            track = item['track']
            played_at = datetime.fromisoformat(item['played_at'].replace('Z', '+00:00'))

            # Get or create album
            album = self.get_or_create_album(track['album']['id'])

            # Get or create song
            song = self._create_song_from_track(track, album)

            # Create listening history entry (avoid duplicates)
            ListeningHistory.objects.get_or_create(
                user=self.user,
                song=song,
                played_at=played_at,
                defaults={
                    'album': album,
                    'context_type': item.get('context', {}).get('type', ''),
                }
            )

        return results

    def search(self, query, types=['album', 'track', 'artist'], limit=10, offset=0):
        """Search Spotify for albums, tracks, or artists.

        GET /search caps ``limit`` at 10 per type per request
        """
        limit = min(limit, 10)
        return self.client.search(q=query, type=','.join(types), limit=limit, offset=offset)

    def get_album(self, spotify_id):
        """Get album details from Spotify"""
        return self.client.album(spotify_id)

    def get_track(self, spotify_id):
        """Get track details from Spotify"""
        return self.client.track(spotify_id)

    def get_artist(self, spotify_id):
        """Get artist details from Spotify"""
        return self.client.artist(spotify_id)
