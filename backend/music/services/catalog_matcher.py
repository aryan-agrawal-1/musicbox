from __future__ import annotations

import re
from collections.abc import Iterable, Sequence

from music.models import Album, Artist, Song


def normalize_catalog_text(value: str | None) -> str:
    """Normalize titles/names so cross-provider matching is more stable."""
    if not value:
        return ""

    normalized = value.lower()
    normalized = re.sub(
        r"\s*[\(\[]\s*(feat|featuring)\.?.*?[\)\]]",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"\s*(feat|featuring|ft)\.?\s+.*", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"[^\w\s]", "", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _clean_string(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _clean_id(value: str | None) -> str | None:
    return _clean_string(value)


def _normalized_artist_names(
    artist_names: Iterable[str] | None = None,
    artists: Sequence[Artist] | None = None,
) -> set[str]:
    normalized: set[str] = set()

    for name in artist_names or []:
        norm = normalize_catalog_text(name)
        if norm:
            normalized.add(norm)

    for artist in artists or []:
        norm = normalize_catalog_text(artist.name)
        if norm:
            normalized.add(norm)

    return normalized


def _normalized_db_artist_names(instance: Album | Song) -> set[str]:
    return {
        normalize_catalog_text(name)
        for name in instance.artists.values_list("name", flat=True)
        if normalize_catalog_text(name)
    }


def _release_year(value: str | None) -> str:
    if not value:
        return ""
    return value[:4]


class CatalogMatcher:
    """Resolve artists/albums/songs across providers without duplicating rows."""

    def find_artist(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        name: str | None = None,
    ) -> Artist | None:
        spotify_id = _clean_id(spotify_id)
        apple_music_id = _clean_id(apple_music_id)
        name = _clean_string(name)
        normalized_name = normalize_catalog_text(name)

        if spotify_id:
            artist = Artist.objects.filter(spotify_id=spotify_id).first()
            if artist:
                return artist

        if apple_music_id:
            artist = Artist.objects.filter(apple_music_id=apple_music_id).first()
            if artist:
                return artist

        if name:
            artist = Artist.objects.filter(name__iexact=name).first()
            if artist:
                return artist

        if normalized_name and name:
            candidates = Artist.objects.filter(name__icontains=name[:20])[:25]
            for candidate in candidates:
                if normalize_catalog_text(candidate.name) == normalized_name:
                    return candidate

        return None

    def resolve_artist(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        name: str | None = None,
        image_url: str | None = None,
        genres: list[str] | None = None,
    ) -> Artist:
        name = _clean_string(name) or "Unknown Artist"
        artist = self.find_artist(
            spotify_id=spotify_id,
            apple_music_id=apple_music_id,
            name=name,
        )
        if artist:
            self._update_artist(
                artist,
                spotify_id=spotify_id,
                apple_music_id=apple_music_id,
                name=name,
                image_url=image_url,
                genres=genres,
            )
            return artist

        return Artist.objects.create(
            spotify_id=_clean_id(spotify_id),
            apple_music_id=_clean_id(apple_music_id),
            name=name,
            image_url=image_url,
            genres=genres or [],
        )

    def find_album(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        name: str | None = None,
        artist_names: Iterable[str] | None = None,
        release_date: str | None = None,
    ) -> Album | None:
        spotify_id = _clean_id(spotify_id)
        apple_music_id = _clean_id(apple_music_id)
        name = _clean_string(name)
        normalized_name = normalize_catalog_text(name)
        normalized_artists = _normalized_artist_names(artist_names=artist_names)

        if spotify_id:
            album = Album.objects.filter(spotify_id=spotify_id).prefetch_related("artists").first()
            if album:
                return album

        if apple_music_id:
            album = Album.objects.filter(apple_music_id=apple_music_id).prefetch_related("artists").first()
            if album:
                return album

        if name:
            candidates = (
                Album.objects.filter(name__iexact=name)
                .prefetch_related("artists")
                .distinct()
            )
            match = self._match_album_from_candidates(
                candidates,
                normalized_name=normalized_name,
                normalized_artists=normalized_artists,
                release_date=release_date,
            )
            if match:
                return match

        primary_artist = next(iter(artist_names or []), None)
        if normalized_name and primary_artist:
            candidates = (
                Album.objects.filter(artists__name__iexact=primary_artist)
                .prefetch_related("artists")
                .distinct()[:50]
            )
            match = self._match_album_from_candidates(
                candidates,
                normalized_name=normalized_name,
                normalized_artists=normalized_artists,
                release_date=release_date,
            )
            if match:
                return match

        return None

    def resolve_album(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        name: str | None = None,
        artist_names: Iterable[str] | None = None,
        artists: Sequence[Artist] | None = None,
        album_type: str = "album",
        release_date: str = "",
        total_tracks: int = 0,
        image_url: str | None = None,
        genres: list[str] | None = None,
    ) -> Album:
        name = _clean_string(name) or "Unknown Album"
        album = self.find_album(
            spotify_id=spotify_id,
            apple_music_id=apple_music_id,
            name=name,
            artist_names=artist_names or [artist.name for artist in artists or []],
            release_date=release_date,
        )
        if album:
            self._update_album(
                album,
                spotify_id=spotify_id,
                apple_music_id=apple_music_id,
                name=name,
                album_type=album_type,
                release_date=release_date,
                total_tracks=total_tracks,
                image_url=image_url,
                genres=genres,
            )
            self._sync_artists(album, artists)
            return album

        album = Album.objects.create(
            spotify_id=_clean_id(spotify_id),
            apple_music_id=_clean_id(apple_music_id),
            name=name,
            album_type=album_type,
            release_date=release_date or "",
            total_tracks=total_tracks or 0,
            image_url=image_url,
            genres=genres or [],
        )
        self._sync_artists(album, artists)
        return album

    def find_song(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        isrc: str | None = None,
        name: str | None = None,
        album: Album | None = None,
        artist_names: Iterable[str] | None = None,
        track_number: int = 0,
        disc_number: int = 1,
    ) -> Song | None:
        spotify_id = _clean_id(spotify_id)
        apple_music_id = _clean_id(apple_music_id)
        isrc = _clean_id(isrc)
        name = _clean_string(name)
        normalized_name = normalize_catalog_text(name)
        normalized_artists = _normalized_artist_names(artist_names=artist_names)

        if spotify_id:
            song = Song.objects.filter(spotify_id=spotify_id).select_related("album").prefetch_related("artists").first()
            if song:
                return song

        if apple_music_id:
            song = Song.objects.filter(apple_music_id=apple_music_id).select_related("album").prefetch_related("artists").first()
            if song:
                return song

        if isrc:
            queryset = Song.objects.filter(isrc=isrc).select_related("album").prefetch_related("artists")
            if album:
                song = queryset.filter(album=album).first()
                if song:
                    return song

            for candidate in queryset[:25]:
                if self._song_matches(
                    candidate,
                    normalized_name=normalized_name,
                    normalized_artists=normalized_artists,
                    album=album,
                ):
                    return candidate

        if album and track_number > 0:
            song = (
                Song.objects.filter(
                    album=album,
                    track_number=track_number,
                    disc_number=disc_number or 1,
                )
                .select_related("album")
                .prefetch_related("artists")
                .first()
            )
            if song and self._song_matches(
                song,
                normalized_name=normalized_name,
                normalized_artists=normalized_artists,
                album=album,
            ):
                return song

        queryset = Song.objects.select_related("album").prefetch_related("artists")
        if album:
            queryset = queryset.filter(album=album)

        if name:
            exact_match = queryset.filter(name__iexact=name).first()
            if exact_match and self._song_matches(
                exact_match,
                normalized_name=normalized_name,
                normalized_artists=normalized_artists,
                album=album,
            ):
                return exact_match

        if normalized_name:
            for candidate in queryset.filter(name__icontains=name[:20] if name else "").distinct()[:50]:
                if self._song_matches(
                    candidate,
                    normalized_name=normalized_name,
                    normalized_artists=normalized_artists,
                    album=album,
                ):
                    return candidate

        return None

    def resolve_song(
        self,
        *,
        spotify_id: str | None = None,
        apple_music_id: str | None = None,
        isrc: str | None = None,
        name: str | None = None,
        album: Album,
        artist_names: Iterable[str] | None = None,
        artists: Sequence[Artist] | None = None,
        track_number: int = 0,
        disc_number: int = 1,
        duration_ms: int = 0,
        explicit: bool = False,
        preview_url: str | None = None,
    ) -> tuple[Song, bool]:
        name = _clean_string(name) or "Unknown Track"
        song = self.find_song(
            spotify_id=spotify_id,
            apple_music_id=apple_music_id,
            isrc=isrc,
            name=name,
            album=album,
            artist_names=artist_names or [artist.name for artist in artists or []],
            track_number=track_number,
            disc_number=disc_number,
        )
        if song:
            self._update_song(
                song,
                spotify_id=spotify_id,
                apple_music_id=apple_music_id,
                isrc=isrc,
                name=name,
                album=album,
                track_number=track_number,
                disc_number=disc_number,
                duration_ms=duration_ms,
                explicit=explicit,
                preview_url=preview_url,
            )
            self._sync_artists(song, artists)
            return song, False

        song = Song.objects.create(
            spotify_id=_clean_id(spotify_id),
            apple_music_id=_clean_id(apple_music_id),
            isrc=_clean_id(isrc),
            name=name,
            album=album,
            track_number=track_number or 0,
            disc_number=disc_number or 1,
            duration_ms=duration_ms or 0,
            explicit=explicit,
            preview_url=preview_url,
        )
        self._sync_artists(song, artists)
        return song, True

    def _update_artist(
        self,
        artist: Artist,
        *,
        spotify_id: str | None,
        apple_music_id: str | None,
        name: str,
        image_url: str | None,
        genres: list[str] | None,
    ) -> None:
        update_fields: list[str] = []

        if spotify_id and not artist.spotify_id:
            artist.spotify_id = spotify_id
            update_fields.append("spotify_id")

        if apple_music_id and not artist.apple_music_id:
            artist.apple_music_id = apple_music_id
            update_fields.append("apple_music_id")

        if name and artist.name == "Unknown Artist":
            artist.name = name
            update_fields.append("name")

        if image_url and not artist.image_url:
            artist.image_url = image_url
            update_fields.append("image_url")

        if genres and not artist.genres:
            artist.genres = genres
            update_fields.append("genres")

        if update_fields:
            artist.save(update_fields=update_fields)

    def _update_album(
        self,
        album: Album,
        *,
        spotify_id: str | None,
        apple_music_id: str | None,
        name: str,
        album_type: str,
        release_date: str,
        total_tracks: int,
        image_url: str | None,
        genres: list[str] | None,
    ) -> None:
        update_fields: list[str] = []

        if spotify_id and not album.spotify_id:
            album.spotify_id = spotify_id
            update_fields.append("spotify_id")

        if apple_music_id and not album.apple_music_id:
            album.apple_music_id = apple_music_id
            update_fields.append("apple_music_id")

        if name and album.name == "Unknown Album":
            album.name = name
            update_fields.append("name")

        if album_type and album.album_type != album_type and album.album_type == "album":
            album.album_type = album_type
            update_fields.append("album_type")

        if release_date and not album.release_date:
            album.release_date = release_date
            update_fields.append("release_date")

        if total_tracks and (album.total_tracks or 0) < total_tracks:
            album.total_tracks = total_tracks
            update_fields.append("total_tracks")

        if image_url and not album.image_url:
            album.image_url = image_url
            update_fields.append("image_url")

        if genres and not album.genres:
            album.genres = genres
            update_fields.append("genres")

        if update_fields:
            album.save(update_fields=update_fields)

    def _update_song(
        self,
        song: Song,
        *,
        spotify_id: str | None,
        apple_music_id: str | None,
        isrc: str | None,
        name: str,
        album: Album,
        track_number: int,
        disc_number: int,
        duration_ms: int,
        explicit: bool,
        preview_url: str | None,
    ) -> None:
        update_fields: list[str] = []

        if spotify_id and not song.spotify_id:
            song.spotify_id = spotify_id
            update_fields.append("spotify_id")

        if apple_music_id and not song.apple_music_id:
            song.apple_music_id = apple_music_id
            update_fields.append("apple_music_id")

        if isrc and not song.isrc:
            song.isrc = isrc
            update_fields.append("isrc")

        if name and song.name == "Unknown Track":
            song.name = name
            update_fields.append("name")

        if song.album_id != album.id and self._albums_equivalent(song.album, album):
            song.album = album
            update_fields.append("album")

        if track_number and not song.track_number:
            song.track_number = track_number
            update_fields.append("track_number")

        if disc_number and not song.disc_number:
            song.disc_number = disc_number
            update_fields.append("disc_number")

        if duration_ms and not song.duration_ms:
            song.duration_ms = duration_ms
            update_fields.append("duration_ms")

        if explicit and not song.explicit:
            song.explicit = True
            update_fields.append("explicit")

        if preview_url and not song.preview_url:
            song.preview_url = preview_url
            update_fields.append("preview_url")

        if update_fields:
            song.save(update_fields=update_fields)

    def _sync_artists(self, instance: Album | Song, artists: Sequence[Artist] | None) -> None:
        if not artists:
            return

        existing_ids = set(instance.artists.values_list("id", flat=True))
        missing = [artist for artist in artists if artist.id not in existing_ids]
        if missing:
            instance.artists.add(*missing)

    def _match_album_from_candidates(
        self,
        candidates: Iterable[Album],
        *,
        normalized_name: str,
        normalized_artists: set[str],
        release_date: str | None,
    ) -> Album | None:
        for candidate in candidates:
            if self._album_matches(
                candidate,
                normalized_name=normalized_name,
                normalized_artists=normalized_artists,
                release_date=release_date,
            ):
                return candidate
        return None

    def _album_matches(
        self,
        album: Album,
        *,
        normalized_name: str,
        normalized_artists: set[str],
        release_date: str | None,
    ) -> bool:
        if normalized_name and normalize_catalog_text(album.name) != normalized_name:
            return False

        if normalized_artists:
            existing_artists = _normalized_db_artist_names(album)
            if not existing_artists or existing_artists.isdisjoint(normalized_artists):
                return False

        if release_date and album.release_date:
            existing_year = _release_year(album.release_date)
            incoming_year = _release_year(release_date)
            if existing_year and incoming_year and existing_year != incoming_year:
                return False

        return True

    def _song_matches(
        self,
        song: Song,
        *,
        normalized_name: str,
        normalized_artists: set[str],
        album: Album | None,
    ) -> bool:
        if normalized_name and normalize_catalog_text(song.name) != normalized_name:
            return False

        if normalized_artists:
            existing_artists = _normalized_db_artist_names(song)
            if not existing_artists or existing_artists.isdisjoint(normalized_artists):
                return False

        if album and song.album_id != album.id and not self._albums_equivalent(song.album, album):
            return False

        return True

    def _albums_equivalent(self, left: Album, right: Album) -> bool:
        if left.id == right.id:
            return True

        left_name = normalize_catalog_text(left.name)
        right_name = normalize_catalog_text(right.name)
        if left_name != right_name:
            return False

        left_artists = _normalized_db_artist_names(left)
        right_artists = _normalized_db_artist_names(right)
        if left_artists and right_artists and left_artists.isdisjoint(right_artists):
            return False

        left_year = _release_year(left.release_date)
        right_year = _release_year(right.release_date)
        if left_year and right_year and left_year != right_year:
            return False

        return True
