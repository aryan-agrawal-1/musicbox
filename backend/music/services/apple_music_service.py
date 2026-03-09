import re
import time
import requests
import jwt
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from music.models import Artist, Album, Song, ListeningHistory


class AppleMusicAuthError(Exception):
    """Raised when the user's Apple Music token is invalid or expired"""
    pass


def _normalize_title(s: str) -> str:
    """Lowercase, strip feat. clauses and punctuation, collapse whitespace."""
    s = s.lower()
    s = re.sub(r'\s*[\(\[]\s*feat\..*?[\)\]]', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s*ft\..*', '', s, flags=re.IGNORECASE)
    s = re.sub(r'[^\w\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


class AppleMusicService:
    """Service for Apple Music API integration"""

    BASE_URL = 'https://api.music.apple.com/v1'
    CACHE_KEY = 'apple_music_dev_token'
    TOKEN_TTL = 43200  # 12 hours in seconds
    CACHE_TTL = 39600  # 11 hours (slightly less to avoid edge cases)

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
        """
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

        # 1. apple_music_id match
        if am_id:
            song = Song.objects.filter(apple_music_id=am_id).first()
            if song:
                return song, False

        # 2. name + artist match within this album
        if track_name and artist_name:
            song = Song.objects.filter(album=album, name__iexact=track_name).first()
            if song:
                if am_id and not song.apple_music_id:
                    song.apple_music_id = am_id
                    song.save(update_fields=['apple_music_id'])
                return song, False

        artwork = attrs.get('artwork', {})
        image_url = None
        if artwork.get('url'):
            image_url = artwork['url'].replace('{w}', '500').replace('{h}', '500')

        artist = self._get_or_create_apple_artist(artist_name)
        song = Song.objects.create(
            apple_music_id=am_id or None,
            isrc=isrc,
            name=track_name or 'Unknown Track',
            album=album,
            duration_ms=attrs.get('durationInMillis', 0),
            track_number=attrs.get('trackNumber', 0),
            disc_number=attrs.get('discNumber', 1),
            explicit=attrs.get('contentRating') == 'explicit',
        )
        song.artists.set([artist])
        return song, True

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

        # Get or create album
        album = None
        created_album = False
        if am_id:
            album = Album.objects.filter(apple_music_id=am_id).first()
        if not album and album_name:
            album = Album.objects.filter(name__iexact=album_name).first()
        if not album:
            artist = self._get_or_create_apple_artist(artist_name)
            album = Album.objects.create(
                apple_music_id=am_id or None,
                name=album_name or 'Unknown Album',
                album_type='album',
                release_date=release_date or '',
                total_tracks=track_count,
                image_url=image_url,
                genres=genres,
            )
            album.artists.set([artist])
            created_album = True
        elif am_id and not album.apple_music_id:
            album.apple_music_id = am_id
            album.save(update_fields=['apple_music_id'])

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

        # 1. apple_music_id match
        if am_id:
            song = Song.objects.filter(apple_music_id=am_id).select_related('album').first()
            if song:
                return song

        # 2. Normalised name + artist match
        norm_name = _normalize_title(track_name)
        norm_artist = _normalize_title(artist_name)
        if norm_name and norm_artist:
            song = (
                Song.objects
                .filter(name__iexact=track_name, artists__name__iexact=artist_name)
                .select_related('album')
                .first()
            )
            if not song:
                # Try with normalised forms
                for s in Song.objects.filter(name__icontains=norm_name).select_related('album').prefetch_related('artists')[:20]:
                    if _normalize_title(s.name) == norm_name:
                        for a in s.artists.all():
                            if _normalize_title(a.name) == norm_artist:
                                song = s
                                break
                    if song:
                        break

            if song:
                # Backfill apple_music_id and isrc if missing
                updated = False
                if am_id and not song.apple_music_id:
                    song.apple_music_id = am_id
                    updated = True
                if isrc and not song.isrc:
                    song.isrc = isrc
                    updated = True
                if updated:
                    song.save(update_fields=[f for f in ['apple_music_id', 'isrc'] if getattr(song, f)])
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
                        album = spotify.get_or_create_album(item['album']['id'])
                        song = Song.objects.filter(spotify_id=item['id']).select_related('album').first()
                        if song:
                            if am_id and not song.apple_music_id:
                                song.apple_music_id = am_id
                                song.save(update_fields=['apple_music_id'])
                            return song
                        break
            except Exception:
                pass  # Spotify search is best-effort; fall through to creation

        # 4. Create minimal record with apple_music_id
        image_url = None
        if artwork.get('url'):
            image_url = artwork['url'].replace('{w}', '500').replace('{h}', '500')

        # Get or create a minimal album
        album = self._get_or_create_apple_album(
            album_name=album_name,
            artist_name=artist_name,
            am_album_id=None,
            image_url=image_url,
            release_date=release_date,
        )

        artist = self._get_or_create_apple_artist(artist_name)

        song = Song.objects.create(
            apple_music_id=am_id or None,
            isrc=isrc,
            name=track_name,
            album=album,
            duration_ms=duration_ms,
            track_number=attrs.get('trackNumber', 0),
            disc_number=attrs.get('discNumber', 1),
            explicit=attrs.get('contentRating') == 'explicit',
        )
        song.artists.set([artist])
        return song

    def _get_or_create_apple_artist(self, name: str) -> Artist:
        if not name:
            name = 'Unknown Artist'
        artist = Artist.objects.filter(name__iexact=name).first()
        if artist:
            return artist
        return Artist.objects.create(name=name)

    def _get_or_create_apple_album(
        self,
        album_name: str,
        artist_name: str,
        am_album_id: str | None,
        image_url: str | None,
        release_date: str,
    ) -> Album:
        if am_album_id:
            album = Album.objects.filter(apple_music_id=am_album_id).first()
            if album:
                return album

        if album_name:
            album = Album.objects.filter(name__iexact=album_name).first()
            if album:
                return album

        artist = self._get_or_create_apple_artist(artist_name)
        album = Album.objects.create(
            apple_music_id=am_album_id,
            name=album_name or 'Unknown Album',
            album_type='album',
            release_date=release_date or '',
            total_tracks=0,
            image_url=image_url,
        )
        album.artists.set([artist])
        return album

    def sync_listening_history(self, user, tracks: list[dict]) -> list[Song]:
        """Match/create songs for each track and write ListeningHistory rows.

        Apple Music provides no timestamps so played_at = now().
        Returns a deduplicated list of Song instances (most recent first).
        """
        now = timezone.now()
        seen_ids: set[int] = set()
        songs: list[Song] = []

        for track in tracks:
            try:
                song = self.match_or_create_song(track)
            except Exception:
                continue  # skip individual failures

            ListeningHistory.objects.get_or_create(
                user=user,
                song=song,
                played_at=now,
                defaults={
                    'album': song.album,
                    'context_type': 'apple_music',
                },
            )

            if song.pk not in seen_ids:
                seen_ids.add(song.pk)
                songs.append(song)

        return songs
