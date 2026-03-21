from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from music.models import Album, Song
from music.services.catalog_matcher import normalize_catalog_text


def _artist_key(instance) -> str:
    names = {
        normalize_catalog_text(name)
        for name in instance.artists.values_list("name", flat=True)
        if normalize_catalog_text(name)
    }
    return "|".join(sorted(names))


def _release_year(value: str | None) -> str:
    if not value:
        return ""
    return value[:4]


def _safe_int(value, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _album_signature(album: Album) -> str:
    return "::".join(
        [
            normalize_catalog_text(album.name),
            _artist_key(album),
            _release_year(album.release_date),
        ]
    )


def _song_signature(song: Song) -> str:
    return "::".join(
        [
            normalize_catalog_text(song.name),
            _artist_key(song),
            _album_signature(song.album),
            str(song.disc_number or 1),
            str(song.track_number or 0),
        ]
    )


def _album_score(album: Album) -> tuple[int, int, int, int, int, int, int]:
    return (
        1 if album.spotify_id else 0,
        1 if album.apple_music_id else 0,
        1 if album.image_url else 0,
        1 if album.release_date else 0,
        1 if album.genres else 0,
        _safe_int(album.total_tracks),
        _safe_int(album.pk),
    )


def _song_score(song: Song) -> tuple[int, int, int, int, int, int, int]:
    return (
        1 if song.spotify_id else 0,
        1 if song.apple_music_id else 0,
        1 if song.isrc else 0,
        1 if song.preview_url else 0,
        1 if song.duration_ms else 0,
        _safe_int(song.track_number),
        _safe_int(song.pk),
    )


class Command(BaseCommand):
    help = (
        "One-off cleanup for duplicate albums and songs created across "
        "Spotify and Apple Music imports."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete duplicate rows. Without this flag the command is a dry run.",
        )

    def handle(self, *args, **options):
        apply = options["apply"]

        if apply:
            self.stdout.write(self.style.WARNING("Applying catalog deduplication. Duplicate rows will be deleted."))
        else:
            self.stdout.write(self.style.WARNING("Dry run only. Re-run with --apply to delete duplicates."))

        album_summary = self._dedupe_albums(apply=apply)
        song_summary = self._dedupe_songs(apply=apply)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "Albums: "
                f"{album_summary['duplicate_groups']} duplicate groups, "
                f"{album_summary['duplicates']} duplicate rows"
                + (f", deleted {album_summary['deleted']}" if apply else "")
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Songs: "
                f"{song_summary['duplicate_groups']} duplicate groups, "
                f"{song_summary['duplicates']} duplicate rows"
                + (f", deleted {song_summary['deleted']}" if apply else "")
            )
        )

    def _dedupe_albums(self, *, apply: bool) -> dict[str, int]:
        groups: dict[str, list[Album]] = defaultdict(list)
        albums = list(Album.objects.prefetch_related("artists").order_by("pk"))

        for album in albums:
            for key in self._album_keys(album):
                groups[key].append(album)

        duplicate_groups = 0
        duplicate_rows: set[int] = set()
        deleted = 0
        seen_groups: set[tuple[int, ...]] = set()

        for group in groups.values():
            unique = self._unique_by_pk(group)
            if len(unique) < 2:
                continue

            canonical, duplicates = self._pick_album_canonical(unique)
            if not duplicates:
                continue

            group_key = tuple(sorted(_safe_int(album.pk) for album in [canonical, *duplicates] if album.pk is not None))
            if len(group_key) < 2:
                continue
            if group_key in seen_groups:
                continue
            seen_groups.add(group_key)

            duplicate_groups += 1
            duplicate_rows.update(album.pk for album in duplicates)

            self.stdout.write(
                f"Album keep `{canonical.pk}` {canonical.name} "
                f"delete {[album.pk for album in duplicates]}"
            )

            if apply:
                with transaction.atomic():
                    for album in duplicates:
                        album.delete()
                        deleted += 1

        return {
            "duplicate_groups": duplicate_groups,
            "duplicates": len(duplicate_rows),
            "deleted": deleted,
        }

    def _dedupe_songs(self, *, apply: bool) -> dict[str, int]:
        groups: dict[str, list[Song]] = defaultdict(list)
        songs = list(
            Song.objects.select_related("album")
            .prefetch_related("artists", "album__artists")
            .order_by("pk")
        )

        for song in songs:
            for key in self._song_keys(song):
                groups[key].append(song)

        duplicate_groups = 0
        duplicate_rows: set[int] = set()
        deleted = 0
        seen_groups: set[tuple[int, ...]] = set()

        for group in groups.values():
            unique = self._unique_by_pk(group)
            if len(unique) < 2:
                continue

            canonical, duplicates = self._pick_song_canonical(unique)
            if not duplicates:
                continue

            group_key = tuple(sorted(_safe_int(song.pk) for song in [canonical, *duplicates] if song.pk is not None))
            if len(group_key) < 2:
                continue
            if group_key in seen_groups:
                continue
            seen_groups.add(group_key)

            duplicate_groups += 1
            duplicate_rows.update(song.pk for song in duplicates)

            self.stdout.write(
                f"Song keep `{canonical.pk}` {canonical.name} "
                f"delete {[song.pk for song in duplicates]}"
            )

            if apply:
                with transaction.atomic():
                    for song in duplicates:
                        song.delete()
                        deleted += 1

        return {
            "duplicate_groups": duplicate_groups,
            "duplicates": len(duplicate_rows),
            "deleted": deleted,
        }

    def _album_keys(self, album: Album) -> list[str]:
        keys = [f"album-meta:{_album_signature(album)}"]
        if album.spotify_id:
            keys.append(f"album-spotify:{album.spotify_id}")
        if album.apple_music_id:
            keys.append(f"album-apple:{album.apple_music_id}")
        return keys

    def _song_keys(self, song: Song) -> list[str]:
        keys = [f"song-meta:{_song_signature(song)}"]
        if song.spotify_id:
            keys.append(f"song-spotify:{song.spotify_id}")
        if song.apple_music_id:
            keys.append(f"song-apple:{song.apple_music_id}")
        if song.isrc:
            keys.append(f"song-isrc:{song.isrc}::{_artist_key(song)}")
        return keys

    def _pick_album_canonical(self, albums: list[Album]) -> tuple[Album, list[Album]]:
        canonical = max(albums, key=_album_score)
        duplicates = [album for album in albums if album.pk != canonical.pk]
        return canonical, duplicates

    def _pick_song_canonical(self, songs: list[Song]) -> tuple[Song, list[Song]]:
        canonical = max(songs, key=_song_score)
        duplicates = [song for song in songs if song.pk != canonical.pk]
        return canonical, duplicates

    def _unique_by_pk(self, items):
        deduped = []
        seen = set()
        for item in items:
            pk = getattr(item, "pk", None)
            if pk is None:
                continue
            if pk in seen:
                continue
            seen.add(pk)
            deduped.append(item)
        return deduped
