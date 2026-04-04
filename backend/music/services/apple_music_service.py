import time
from datetime import timedelta

import requests
import jwt
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from music.models import Artist, Album, Song, ListeningHistory
from music.services.catalog_matcher import CatalogMatcher, normalize_catalog_text


class AppleMusicAuthError(Exception):
    """Raised when the user's Apple Music token is invalid or expired"""
    pass


def _normalize_title(s: str) -> str:
    """Lowercase, strip feat. clauses and punctuation, collapse whitespace."""
    return normalize_catalog_text(s)


# GET /v1/catalog/{storefront}/charts — max `limit` per request (API returns 400 above this).
APPLE_MUSIC_CHARTS_MAX_LIMIT = 200


class AppleMusicService:
    """Service for Apple Music API integration"""

    BASE_URL = 'https://api.music.apple.com/v1'
    CACHE_KEY = 'apple_music_dev_token'
    TOKEN_TTL = 43200  # 12 hours in seconds
    CACHE_TTL = 39600  # 11 hours (slightly less to avoid edge cases)

    def __init__(self):
        self.matcher = CatalogMatcher()

    # ------------------------------------------------------------------
    # Developer token (JWT, ES256, signed server-side)
    # ------------------------------------------------------------------

    def generate_developer_token(self) -> str:
        cached = cache.get(self.CACHE_KEY)
        if cached:
            return cached
        token = self._build_developer_token()
        cache.set(self.CACHE_KEY, token, timeout=self.CACHE_TTL)
        return token

    def _build_developer_token(self) -> str:
        key_id = settings.APPLE_MUSIC_KEY_ID
        team_id = settings.APPLE_MUSIC_TEAM_ID
        private_key_str = settings.APPLE_MUSIC_PRIVATE_KEY

        if not all([key_id, team_id, private_key_str]):
            raise ValueError('Apple Music credentials not configured in settings.')

        # .p8 files may be stored with literal \n — normalise them
        private_key_pem = private_key_str.replace('\\n', '\n').encode()

        now = int(time.time())
        payload = {
            'iss': team_id,
            'iat': now,
            'exp': now + self.TOKEN_TTL,
        }
        headers = {
            'alg': 'ES256',
            'kid': key_id,
        }
        return jwt.encode(payload, private_key_pem, algorithm='ES256', headers=headers)

    # ------------------------------------------------------------------
    # Apple Music API calls
    # ------------------------------------------------------------------

    def _dev_headers(self) -> dict:
        return {'Authorization': f'Bearer {self.generate_developer_token()}'}

    def _auth_headers(self, user_token: str) -> dict:
        return {
            'Authorization': f'Bearer {self.generate_developer_token()}',
            'Music-User-Token': user_token,
        }

    def get_charts(self, storefront: str = 'us', limit: int = 25, genre_id: str | None = None) -> dict:
        """Fetch top albums and songs from Apple Music catalog charts.

        Returns the 'results' dict with 'albums' and 'songs' keys.
        No user token required — developer token only.

        ``limit`` is capped at APPLE_MUSIC_CHARTS_MAX_LIMIT (200); higher values are a 400 from Apple.
        """
        limit = min(max(limit, 1), APPLE_MUSIC_CHARTS_MAX_LIMIT)
        params = {'types': 'albums,songs', 'limit': limit}
        if genre_id:
            params['genre'] = genre_id
        try:
            resp = requests.get(
                f'{self.BASE_URL}/catalog/{storefront}/charts',
                headers=self._dev_headers(),
                params=params,
                timeout=15,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise Exception(f'Apple Music charts request failed: {exc}') from exc
        return resp.json().get('results', {})

    def get_album_with_tracks(self, album_id: str, storefront: str = 'us') -> dict | None:
        """Fetch a single album with its tracks relationship included.

        Returns the album data dict or None on error.
        """
        try:
            resp = requests.get(
                f'{self.BASE_URL}/catalog/{storefront}/albums/{album_id}',
                headers=self._dev_headers(),
                params={'include': 'tracks'},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get('data', [])
            return data[0] if data else None
        except requests.RequestException:
            return None

    def create_song_from_apple_track(self, track: dict, album: 'Album') -> tuple['Song', bool]:
        """Create or get a Song from an Apple Music track dict with a known Album.

        Returns (song, created) where created is True if a new row was inserted.
        """
        am_id = track.get('id', '')
        attrs = track.get('attributes', {})
        track_name = attrs.get('name', '')
        artist_name = attrs.get('artistName', '')
        isrc = attrs.get('isrc')

        artist = self._get_or_create_apple_artist(artist_name)
        return self.matcher.resolve_song(
            apple_music_id=am_id or None,
            isrc=isrc,
            name=track_name or 'Unknown Track',
            album=album,
            artist_names=[artist_name],
            artists=[artist],
            duration_ms=attrs.get('durationInMillis', 0),
            track_number=attrs.get('trackNumber', 0),
            disc_number=attrs.get('discNumber', 1),
            explicit=attrs.get('contentRating') == 'explicit',
        )

    def create_album_from_apple(self, album_dict: dict, storefront: str = 'us') -> tuple['Album', int]:
        """Create or get an Album (with all tracks) from an Apple Music album dict.

        Returns (album, songs_created_count).
        """
        am_id = album_dict.get('id', '')
        attrs = album_dict.get('attributes', {})
        album_name = attrs.get('name', '')
        artist_name = attrs.get('artistName', '')
        release_date = attrs.get('releaseDate', '')
        track_count = attrs.get('trackCount', 0)
        genres = attrs.get('genreNames', [])

        artwork = attrs.get('artwork', {})
        image_url = None
        if artwork.get('url'):
            image_url = artwork['url'].replace('{w}', '500').replace('{h}', '500')

        artist = self._get_or_create_apple_artist(artist_name)
        album = self.matcher.resolve_album(
            apple_music_id=am_id or None,
            name=album_name or 'Unknown Album',
            artist_names=[artist_name],
            artists=[artist],
            album_type='album',
            release_date=release_date or '',
            total_tracks=track_count,
            image_url=image_url,
            genres=genres,
        )

        # Fetch full album with tracks
        songs_created = 0
        full_album = self.get_album_with_tracks(am_id, storefront) if am_id else None
        if full_album:
            tracks = (
                full_album.get('relationships', {})
                .get('tracks', {})
                .get('data', [])
            )
            for track in tracks:
                try:
                    _, created = self.create_song_from_apple_track(track, album)
                    if created:
                        songs_created += 1
                except Exception:
                    continue

        return album, songs_created

    def get_recently_played(self, user_token: str, storefront: str = 'us') -> list[dict]:
        """Fetch up to 50 recently played tracks from Apple Music API.

        Returns a list of track attribute dicts (Apple Music Song objects).
        Note: Apple Music does not include playback timestamps.
        """
        headers = self._auth_headers(user_token)
        tracks = []
        offset = 0

        while len(tracks) < 50:
            try:
                resp = requests.get(
                    f'{self.BASE_URL}/me/recent/played/tracks',
                    headers=headers,
                    params={'limit': 10, 'offset': offset},
                    timeout=10,
                )
            except requests.RequestException as exc:
                raise Exception(f'Apple Music API request failed: {exc}') from exc

            if resp.status_code == 401:
                raise AppleMusicAuthError('Apple Music user token expired or invalid.')
            resp.raise_for_status()

            data = resp.json().get('data', [])
            if not data:
                break
            tracks.extend(data)
            offset += len(data)
            if len(data) < 10:
                break

        return tracks

    # ------------------------------------------------------------------
    # Track matching & history sync
    # ------------------------------------------------------------------

    def _track_snapshot_key(self, track: dict) -> str:
        """Return a stable ordered key for an Apple recent-played item."""
        track_id = str(track.get('id') or '').strip()
        if track_id:
            return track_id

        attrs = track.get('attributes', {})
        return 'fallback:{name}:{artist}:{album}'.format(
            name=_normalize_title(attrs.get('name', '')),
            artist=_normalize_title(attrs.get('artistName', '')),
            album=_normalize_title(attrs.get('albumName', '')),
        )

    def _build_snapshot_keys(self, tracks: list[dict]) -> list[str]:
        return [self._track_snapshot_key(track) for track in tracks]

    @staticmethod
    def _overlap_length(current_keys: list[str], previous_keys: list[str]) -> int:
        """Find the longest current suffix that matches the previous prefix."""
        max_overlap = min(len(current_keys), len(previous_keys))
        for overlap_size in range(max_overlap, 0, -1):
            if current_keys[-overlap_size:] == previous_keys[:overlap_size]:
                return overlap_size
        return 0

    @staticmethod
    def _history_snapshot_key(entry: ListeningHistory) -> str:
        if entry.source_item_id:
            return entry.source_item_id
        if entry.song.apple_music_id:
            return entry.song.apple_music_id
        return f'song:{entry.song_id}'

    def _bootstrap_snapshot_keys(self, user, limit: int = 50) -> list[str]:
        """Infer the latest Apple snapshot from existing listening history."""
        history = ListeningHistory.objects.filter(
            user=user,
            context_type='apple_music',
        ).select_related('song')

        sourced_rows = list(
            history
            .filter(source_provider='apple_music')
            .exclude(source_item_id='')
            .order_by('-played_at', 'id')[:limit]
        )
        if sourced_rows:
            return [entry.source_item_id for entry in sourced_rows]

        latest_played_at = history.order_by('-played_at').values_list('played_at', flat=True).first()
        if latest_played_at is None:
            return []

        legacy_batch = list(
            history
            .filter(played_at=latest_played_at)
            .order_by('id')[:limit]
        )
        return [self._history_snapshot_key(entry) for entry in legacy_batch]

    def match_or_create_song(self, track: dict) -> Song:
        """Match an Apple Music track dict to an existing Song or create one.

        Matching priority:
        1. apple_music_id — already imported this track
        2. Normalised name + primary artist name
        3. Spotify catalog search via SpotifyService (keeps canonical metadata)
        4. Create minimal Song record with apple_music_id only
        """
        attrs = track.get('attributes', {})
        am_id = track.get('id', '')
        track_name = attrs.get('name', '')
        artist_name = attrs.get('artistName', '')
        album_name = attrs.get('albumName', '')
        isrc = attrs.get('isrc')
        duration_ms = attrs.get('durationInMillis', 0)
        artwork = attrs.get('artwork', {})
        release_date = attrs.get('releaseDate', '')
        norm_name = _normalize_title(track_name)
        norm_artist = _normalize_title(artist_name)
        image_url = None
        if artwork.get('url'):
            image_url = artwork['url'].replace('{w}', '500').replace('{h}', '500')

        album = self._get_or_create_apple_album(
            album_name=album_name,
            artist_name=artist_name,
            am_album_id=None,
            image_url=image_url,
            release_date=release_date,
        )
        artist = self._get_or_create_apple_artist(artist_name)

        local_song = self.matcher.find_song(
            apple_music_id=am_id or None,
            isrc=isrc,
            name=track_name,
            album=album,
            artist_names=[artist_name],
            track_number=attrs.get('trackNumber', 0),
            disc_number=attrs.get('discNumber', 1),
        )
        if local_song:
            song, _ = self.matcher.resolve_song(
                apple_music_id=am_id or None,
                isrc=isrc,
                name=track_name,
                album=album,
                artist_names=[artist_name],
                artists=[artist],
                duration_ms=duration_ms,
                track_number=attrs.get('trackNumber', 0),
                disc_number=attrs.get('discNumber', 1),
                explicit=attrs.get('contentRating') == 'explicit',
            )
            return song

        # 3. Try Spotify catalog search to keep canonical Spotify metadata
        if track_name and artist_name:
            try:
                from music.services.spotify_service import SpotifyService
                spotify = SpotifyService()
                results = spotify.search(f'{track_name} {artist_name}', types=['track'], limit=5)
                for item in results.get('tracks', {}).get('items', []):
                    item_name = _normalize_title(item.get('name', ''))
                    item_artist = _normalize_title(
                        item['artists'][0]['name'] if item.get('artists') else ''
                    )
                    if item_name == norm_name and item_artist == norm_artist:
                        spotify_album = spotify.get_or_create_album(item['album']['id'])
                        spotify_artists = [
                            spotify.get_or_create_artist_from_data(artist_data)
                            for artist_data in item.get('artists', [])
                        ]
                        song, _ = self.matcher.resolve_song(
                            spotify_id=item.get('id'),
                            apple_music_id=am_id or None,
                            isrc=isrc,
                            name=item.get('name') or track_name,
                            album=spotify_album,
                            artist_names=[artist_data.get('name') for artist_data in item.get('artists', [])],
                            artists=spotify_artists,
                            duration_ms=item.get('duration_ms', duration_ms),
                            track_number=item.get('track_number', attrs.get('trackNumber', 0)),
                            disc_number=item.get('disc_number', attrs.get('discNumber', 1)),
                            explicit=item.get('explicit', attrs.get('contentRating') == 'explicit'),
                            preview_url=item.get('preview_url'),
                        )
                        return song
            except Exception:
                pass  # Spotify search is best-effort; fall through to creation

        # 4. Create minimal record with apple_music_id
        song, _ = self.matcher.resolve_song(
            apple_music_id=am_id or None,
            isrc=isrc,
            name=track_name,
            album=album,
            artist_names=[artist_name],
            artists=[artist],
            duration_ms=duration_ms,
            track_number=attrs.get('trackNumber', 0),
            disc_number=attrs.get('discNumber', 1),
            explicit=attrs.get('contentRating') == 'explicit',
        )
        return song

    def _get_or_create_apple_artist(self, name: str) -> Artist:
        return self.matcher.resolve_artist(name=name or 'Unknown Artist')

    def _get_or_create_apple_album(
        self,
        album_name: str,
        artist_name: str,
        am_album_id: str | None,
        image_url: str | None,
        release_date: str,
    ) -> Album:
        artist = self._get_or_create_apple_artist(artist_name)
        return self.matcher.resolve_album(
            apple_music_id=am_album_id,
            name=album_name or 'Unknown Album',
            artist_names=[artist_name],
            artists=[artist],
            album_type='album',
            release_date=release_date or '',
            total_tracks=0,
            image_url=image_url,
        )

    def sync_listening_history(self, user, tracks: list[dict]) -> list[Song]:
        """Match/create songs for each track and write ListeningHistory rows.

        Apple Music provides no playback timestamps, so recent-played sync is
        treated as a rolling snapshot. We only import the non-overlapping prefix
        of the new snapshot and synthesize descending timestamps for display.

        Returns a deduplicated list of Song instances (most recent first).
        """
        seen_ids: set[int] = set()
        songs: list[Song] = []
        current_keys = self._build_snapshot_keys(tracks)

        with transaction.atomic():
            locked_user = type(user).objects.select_for_update().get(pk=user.pk)
            previous_keys = list(locked_user.apple_music_recent_track_ids or [])
            if not previous_keys:
                previous_keys = self._bootstrap_snapshot_keys(locked_user)
            overlap = self._overlap_length(current_keys, previous_keys)
            import_count = len(tracks) - overlap
            tracks_to_import = tracks[:import_count]
            now = timezone.now()

            for index, track in enumerate(tracks_to_import):
                try:
                    song = self.match_or_create_song(track)
                except Exception:
                    continue  # skip individual failures

                ListeningHistory.objects.create(
                    user=locked_user,
                    song=song,
                    album=song.album,
                    played_at=now - timedelta(seconds=index),
                    context_type='apple_music',
                    source_provider='apple_music',
                    source_item_id=self._track_snapshot_key(track),
                )

                if song.pk not in seen_ids:
                    seen_ids.add(song.pk)
                    songs.append(song)

            locked_user.apple_music_recent_track_ids = current_keys
            locked_user.save(update_fields=['apple_music_recent_track_ids'])

        return songs
