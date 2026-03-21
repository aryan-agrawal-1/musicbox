from django.test import TestCase
from django.core.management import call_command
from django.urls import reverse
from unittest.mock import patch
from types import SimpleNamespace

from music.models import Album, Artist, Song
from music.management.commands.dedupe_catalog import Command as DedupeCatalogCommand
from music.services.apple_music_service import AppleMusicService
from music.services.catalog_matcher import CatalogMatcher
from music.services.spotify_service import SpotifyService


def _fake_spotify_service_class(search_payload, matcher):
    class FakeSpotifyService:
        def __init__(self):
            self.matcher = matcher
            self.client = None

        def search(self, query, types=None, limit=10, offset=0):
            return search_payload

        def get_or_create_artist_from_data(self, artist_data):
            return self.matcher.resolve_artist(
                spotify_id=artist_data.get('id'),
                name=artist_data.get('name'),
                image_url=(artist_data.get('images') or [{}])[0].get('url'),
                genres=artist_data.get('genres', []),
            )

        def get_or_create_album_from_data(self, album_data, tracks=None):
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
            return album

        def _create_song_from_track(self, track_data, album):
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

    return FakeSpotifyService


class CatalogDeduplicationTests(TestCase):
    def setUp(self):
        self.matcher = CatalogMatcher()

    def _spotify_service(self):
        service = SpotifyService.__new__(SpotifyService)
        service.user = None
        service.matcher = self.matcher
        service.client = None
        return service

    def _search_spotify_service(self, search_payload):
        return _fake_spotify_service_class(search_payload, self.matcher)

    def test_spotify_album_payload_reuses_existing_apple_album(self):
        artist = Artist.objects.create(name='Daft Punk')
        album = Album.objects.create(
            apple_music_id='apple-discovery',
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        album.artists.add(artist)

        service = self._spotify_service()
        resolved = service.get_or_create_album_from_data(
            {
                'id': 'spotify-discovery',
                'name': 'Discovery',
                'artists': [{'id': 'spotify-daft-punk', 'name': 'Daft Punk'}],
                'album_type': 'album',
                'release_date': '2001-03-12',
                'total_tracks': 14,
                'images': [],
                'genres': [],
            },
            tracks=[],
        )

        artist.refresh_from_db()
        album.refresh_from_db()

        self.assertEqual(resolved.pk, album.pk)
        self.assertEqual(album.spotify_id, 'spotify-discovery')
        self.assertEqual(artist.spotify_id, 'spotify-daft-punk')
        self.assertEqual(Album.objects.count(), 1)
        self.assertEqual(Artist.objects.count(), 1)

    def test_apple_track_reuses_existing_spotify_song(self):
        artist = Artist.objects.create(
            spotify_id='spotify-daft-punk',
            name='Daft Punk',
        )
        album = Album.objects.create(
            spotify_id='spotify-discovery',
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        album.artists.add(artist)
        song = Song.objects.create(
            spotify_id='spotify-digital-love',
            name='Digital Love',
            album=album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        song.artists.add(artist)

        service = AppleMusicService()
        resolved, created = service.create_song_from_apple_track(
            {
                'id': 'apple-digital-love',
                'attributes': {
                    'name': 'Digital Love',
                    'artistName': 'Daft Punk',
                    'isrc': 'GBDUW0000059',
                    'durationInMillis': 300000,
                    'trackNumber': 4,
                    'discNumber': 1,
                },
            },
            album,
        )

        song.refresh_from_db()

        self.assertFalse(created)
        self.assertEqual(resolved.pk, song.pk)
        self.assertEqual(song.apple_music_id, 'apple-digital-love')
        self.assertEqual(song.isrc, 'GBDUW0000059')
        self.assertEqual(Song.objects.count(), 1)

    def test_album_name_match_requires_artist_overlap(self):
        queen = Artist.objects.create(name='Queen')
        greatest_hits = Album.objects.create(
            apple_music_id='queen-greatest-hits',
            name='Greatest Hits',
            album_type='album',
            release_date='1981-10-26',
            total_tracks=17,
        )
        greatest_hits.artists.add(queen)

        eagles = self.matcher.resolve_artist(name='Eagles')
        resolved = self.matcher.resolve_album(
            spotify_id='eagles-greatest-hits',
            name='Greatest Hits',
            artist_names=['Eagles'],
            artists=[eagles],
            album_type='album',
            release_date='1976-02-17',
            total_tracks=10,
        )

        self.assertNotEqual(resolved.pk, greatest_hits.pk)
        self.assertEqual(Album.objects.count(), 2)

    def test_dedupe_catalog_command_deletes_duplicate_album_and_song_rows(self):
        artist = Artist.objects.create(name='Daft Punk')

        keep_album = Album.objects.create(
            spotify_id='spotify-discovery',
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        keep_album.artists.add(artist)

        duplicate_album = Album.objects.create(
            apple_music_id='apple-discovery',
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        duplicate_album.artists.add(artist)

        keep_song = Song.objects.create(
            spotify_id='spotify-digital-love',
            name='Digital Love',
            album=keep_album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        keep_song.artists.add(artist)

        duplicate_song = Song.objects.create(
            apple_music_id='apple-digital-love',
            name='Digital Love',
            album=duplicate_album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        duplicate_song.artists.add(artist)

        call_command('dedupe_catalog', apply=True)

        self.assertTrue(Album.objects.filter(pk=keep_album.pk).exists())
        self.assertFalse(Album.objects.filter(pk=duplicate_album.pk).exists())
        self.assertTrue(Song.objects.filter(pk=keep_song.pk).exists())
        self.assertFalse(Song.objects.filter(pk=duplicate_song.pk).exists())

    def test_dedupe_catalog_command_handles_overlapping_song_groups_after_delete(self):
        artist = Artist.objects.create(name='Daft Punk')
        album = Album.objects.create(
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        album.artists.add(artist)

        keep_song = Song.objects.create(
            spotify_id='spotify-digital-love',
            isrc='GBDUW0000059',
            name='Digital Love',
            album=album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        keep_song.artists.add(artist)

        duplicate_song = Song.objects.create(
            apple_music_id='apple-digital-love',
            isrc='GBDUW0000059',
            name='Digital Love',
            album=album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        duplicate_song.artists.add(artist)

        # This duplicate pair appears in both song-meta and song-isrc groups.
        # The command should not crash when the deleted stale instance is seen again.
        call_command('dedupe_catalog', apply=True)

        self.assertTrue(Song.objects.filter(pk=keep_song.pk).exists())
        self.assertFalse(Song.objects.filter(pk=duplicate_song.pk).exists())

    def test_apple_import_then_search_api_returns_song_once(self):
        artist = Artist.objects.create(
            spotify_id='spotify-daft-punk',
            name='Daft Punk',
        )
        album = Album.objects.create(
            spotify_id='spotify-discovery',
            name='Discovery',
            album_type='album',
            release_date='2001-03-12',
            total_tracks=14,
        )
        album.artists.add(artist)
        song = Song.objects.create(
            spotify_id='spotify-digital-love',
            name='Digital Love',
            album=album,
            track_number=4,
            disc_number=1,
            duration_ms=300000,
        )
        song.artists.add(artist)

        apple_service = AppleMusicService()
        apple_song, created = apple_service.create_song_from_apple_track(
            {
                'id': 'apple-digital-love',
                'attributes': {
                    'name': 'Digital Love',
                    'artistName': 'Daft Punk',
                    'isrc': 'GBDUW0000059',
                    'durationInMillis': 300000,
                    'trackNumber': 4,
                    'discNumber': 1,
                },
            },
            album,
        )

        self.assertFalse(created)
        self.assertEqual(apple_song.pk, song.pk)

        search_payload = {
            'tracks': {
                'items': [
                    {
                        'id': 'spotify-digital-love',
                        'name': 'Digital Love',
                        'track_number': 4,
                        'disc_number': 1,
                        'duration_ms': 300000,
                        'explicit': False,
                        'preview_url': None,
                        'artists': [
                            {
                                'id': 'spotify-daft-punk',
                                'name': 'Daft Punk',
                            }
                        ],
                        'album': {
                            'id': 'spotify-discovery',
                            'name': 'Discovery',
                            'album_type': 'album',
                            'release_date': '2001-03-12',
                            'total_tracks': 14,
                            'images': [],
                            'artists': [
                                {
                                    'id': 'spotify-daft-punk',
                                    'name': 'Daft Punk',
                                }
                            ],
                        },
                    }
                ]
            }
        }

        with patch('music.views.SpotifyService', self._search_spotify_service(search_payload)):
            response = self.client.get(reverse('music-search'), {'q': 'Digital Love', 'type': 'track'})

        song.refresh_from_db()
        album.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['tracks']), 1)
        self.assertEqual(response.data['tracks'][0]['id'], song.pk)
        self.assertEqual(response.data['tracks'][0]['name'], 'Digital Love')
        self.assertEqual(Song.objects.count(), 1)
        self.assertEqual(Album.objects.count(), 1)
        self.assertEqual(song.apple_music_id, 'apple-digital-love')

    def test_dedupe_command_song_picker_handles_missing_numeric_values(self):
        command = DedupeCatalogCommand()
        first = SimpleNamespace(
            spotify_id='spotify-1',
            apple_music_id=None,
            isrc=None,
            preview_url=None,
            duration_ms=None,
            track_number=None,
            pk=10,
        )
        second = SimpleNamespace(
            spotify_id=None,
            apple_music_id='apple-1',
            isrc='isrc-1',
            preview_url=None,
            duration_ms=1000,
            track_number=1,
            pk=11,
        )

        canonical, duplicates = command._pick_song_canonical([first, second])

        self.assertEqual(canonical.pk, 10)
        self.assertEqual([song.pk for song in duplicates], [11])


class LocalFirstSearchTests(TestCase):
    """Local search endpoint and Spotify fill exclusions."""

    def test_local_search_returns_album_track_artist(self):
        artist = Artist.objects.create(name='LocalSearchArtistXYZ')
        album = Album.objects.create(
            name='LocalSearchAlbumXYZ',
            album_type='album',
            release_date='2020-01-01',
            total_tracks=1,
        )
        album.artists.add(artist)
        song = Song.objects.create(
            name='LocalSearchSongXYZ',
            album=album,
            track_number=1,
            disc_number=1,
            duration_ms=120_000,
        )
        song.artists.add(artist)

        r = self.client.get(
            reverse('music-search-local'),
            {'q': 'LocalSearch', 'type': 'album,track,artist', 'limit': 10},
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(a['name'] == 'LocalSearchAlbumXYZ' for a in r.data['albums']))
        self.assertTrue(any(t['name'] == 'LocalSearchSongXYZ' for t in r.data['tracks']))
        self.assertTrue(any(a['name'] == 'LocalSearchArtistXYZ' for a in r.data['artists']))

    def test_spotify_fill_excludes_track_ids(self):
        matcher = CatalogMatcher()
        artist = Artist.objects.create(spotify_id='sf-artist', name='Fill Artist')
        album = Album.objects.create(
            spotify_id='sf-album',
            name='Fill Album',
            album_type='album',
            release_date='2020-01-01',
            total_tracks=2,
        )
        album.artists.add(artist)
        song_keep = Song.objects.create(
            spotify_id='sf-track-keep',
            name='Keep Me',
            album=album,
            track_number=1,
            disc_number=1,
            duration_ms=1000,
        )
        song_keep.artists.add(artist)
        song_drop = Song.objects.create(
            spotify_id='sf-track-drop',
            name='Drop Me',
            album=album,
            track_number=2,
            disc_number=1,
            duration_ms=2000,
        )
        song_drop.artists.add(artist)

        album_nested = {
            'id': 'sf-album',
            'name': 'Fill Album',
            'album_type': 'album',
            'release_date': '2020-01-01',
            'total_tracks': 2,
            'images': [],
            'artists': [{'id': 'sf-artist', 'name': 'Fill Artist'}],
        }
        search_payload = {
            'tracks': {
                'items': [
                    {
                        'id': 'sf-track-drop',
                        'name': 'Drop Me',
                        'track_number': 2,
                        'disc_number': 1,
                        'duration_ms': 2000,
                        'explicit': False,
                        'preview_url': None,
                        'artists': [{'id': 'sf-artist', 'name': 'Fill Artist'}],
                        'album': album_nested,
                    },
                    {
                        'id': 'sf-track-keep',
                        'name': 'Keep Me',
                        'track_number': 1,
                        'disc_number': 1,
                        'duration_ms': 1000,
                        'explicit': False,
                        'preview_url': None,
                        'artists': [{'id': 'sf-artist', 'name': 'Fill Artist'}],
                        'album': album_nested,
                    },
                ]
            }
        }

        with patch(
            'music.views.SpotifyService',
            _fake_spotify_service_class(search_payload, matcher),
        ):
            r = self.client.get(
                reverse('music-search-spotify-fill'),
                {
                    'q': 'Fill',
                    'type': 'track',
                    'limit': 10,
                    'exclude_track_ids': f'{song_drop.pk}',
                },
            )

        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['tracks']), 1)
        self.assertEqual(r.data['tracks'][0]['id'], song_keep.pk)

    def test_spotify_fill_invalid_exclude_ids_ignored(self):
        matcher = CatalogMatcher()
        search_payload = {'tracks': {'items': []}}
        with patch(
            'music.views.SpotifyService',
            _fake_spotify_service_class(search_payload, matcher),
        ):
            r = self.client.get(
                reverse('music-search-spotify-fill'),
                {
                    'q': 'x',
                    'type': 'track',
                    'exclude_track_ids': '1,notanumber,2',
                },
            )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data.get('tracks'), [])
