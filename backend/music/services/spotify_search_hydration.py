"""Hydrate Spotify search API payloads into DB rows + serialized dicts."""

from music.models import Album, Artist, Song
from music.serializers import AlbumSerializer, ArtistSerializer, SongSerializer


class SpotifySearchHydrator:
    """Turn Spotify search result items into serialized catalog entities."""

    def __init__(self, spotify_service):
        self._spotify_service = spotify_service

    def hydrate_albums(self, items):
        if not items:
            return []
        existing = {
            a.spotify_id: a
            for a in Album.objects.filter(
                spotify_id__in=[i['id'] for i in items]
            ).prefetch_related('artists')
        }
        results = []
        for item in items:
            try:
                album = existing.get(item['id'])
                if not album:
                    album = self._spotify_service.get_or_create_album_from_data(item)
                    album = Album.objects.prefetch_related('artists').get(pk=album.pk)
                results.append(AlbumSerializer(album).data)
            except Exception:
                pass
        return results

    def hydrate_tracks(self, items):
        if not items:
            return []
        existing = {
            s.spotify_id: s
            for s in Song.objects.filter(
                spotify_id__in=[i['id'] for i in items]
            ).select_related('album').prefetch_related('artists')
        }
        results = []
        for item in items:
            try:
                song = existing.get(item['id'])
                if not song:
                    album = self._spotify_service.get_or_create_album_from_data(item['album'])
                    song = self._spotify_service._create_song_from_track(item, album)
                    song = Song.objects.select_related('album').prefetch_related('artists').get(pk=song.pk)
                results.append(SongSerializer(song).data)
            except Exception:
                pass
        return results

    def hydrate_artists(self, items):
        if not items:
            return []
        existing = {
            a.spotify_id: a
            for a in Artist.objects.filter(spotify_id__in=[i['id'] for i in items])
        }
        results = []
        for item in items:
            try:
                artist = existing.get(item['id']) or self._spotify_service.get_or_create_artist_from_data(item)
                results.append(ArtistSerializer(artist).data)
            except Exception:
                pass
        return results
