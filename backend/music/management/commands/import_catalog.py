"""
Management command to bulk-import albums and songs from Spotify into the local database.

Since Spotify's Feb 2026 API removes batch-fetch endpoints (GET /albums, GET /tracks)
and caps search results at 10 per page, this command:
  1. Runs many search queries (by genre, decade, etc.) with offset-based pagination.
  2. Collects unique album IDs not already in the DB.
  3. Fetches each full album individually (which also creates all tracks and artists).
  4. Applies configurable rate-limiting delays between requests.

Usage:
    python manage.py import_catalog
    python manage.py import_catalog --target 500 --delay 0.5
    python manage.py import_catalog --target 100 --genres pop rock jazz
"""

import time

from django.core.management.base import BaseCommand
from music.models import Album
from music.services.spotify_service import SpotifyService


# Diverse search queries to discover a wide range of albums.
# Spotify search (type=album) supports genre: and year: filters.
DEFAULT_QUERIES = [
    # Genres
    "genre:pop",
    "genre:rock",
    "genre:hip-hop",
    "genre:r-n-b",
    "genre:jazz",
    "genre:electronic",
    "genre:classical",
    "genre:country",
    "genre:metal",
    "genre:indie",
    "genre:alternative",
    "genre:latin",
    "genre:folk",
    "genre:soul",
    "genre:reggae",
    "genre:blues",
    "genre:punk",
    "genre:funk",
    # Recent years (broad – captures popular releases across all genres)
    "year:2025",
    "year:2024",
    "year:2023",
    "year:2022",
    "year:2021",
    "year:2020",
    "year:2019",
    "year:2018",
    "year:2017",
    "year:2016",
    # Genre + year combos for more variety
    "genre:pop year:2024",
    "genre:pop year:2023",
    "genre:hip-hop year:2024",
    "genre:hip-hop year:2023",
    "genre:rock year:2024",
    "genre:rock year:2023",
    "genre:electronic year:2024",
    "genre:r-n-b year:2024",
    "genre:indie year:2024",
    "genre:indie year:2023",
    # Older decades
    "year:2010",
    "year:2005",
    "year:2000",
    "year:1995",
    "year:1990",
    "year:1985",
    "year:1980",
    # Classic genre searches
    "genre:jazz year:1960",
    "genre:jazz year:1970",
    "genre:rock year:1970",
    "genre:rock year:1980",
    "genre:soul year:1970",
    "genre:blues year:1960",
    "genre:classical",
    # Broad popularity-oriented searches
    "album",
    "best album",
    "top album",
]

# Maximum pages to fetch per query before moving on (10 results × pages = 10×100 = 1000 max).
# Spotify caps offset+limit at 1000.
MAX_PAGES_PER_QUERY = 20
SEARCH_LIMIT = 10  # Hard cap imposed by Spotify Feb 2026 API


class Command(BaseCommand):
    help = (
        "Bulk-import albums and songs from Spotify. "
        "Uses paginated search across genres/decades; fetches each album individually."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target",
            type=int,
            default=200,
            help="Target number of NEW albums to import (default: 200).",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.3,
            help="Seconds to wait between individual album fetches (default: 0.3).",
        )
        parser.add_argument(
            "--search-delay",
            type=float,
            default=0.1,
            help="Seconds to wait between search requests (default: 0.1).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Discover album IDs without importing them.",
        )

    def handle(self, *args, **options):
        target = options["target"]
        delay = options["delay"]
        search_delay = options["search_delay"]
        dry_run = options["dry_run"]

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Importing up to {target} albums from Spotify "
                f"({'DRY RUN — discovery only' if dry_run else 'live import'})..."
            )
        )

        service = SpotifyService()

        # --- Phase 1: Discover album IDs via search ---
        discovered = self._discover_album_ids(service, target, search_delay)
        self.stdout.write(
            f"\nDiscovered {len(discovered)} candidate album IDs not yet in the DB."
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run complete — no albums imported."))
            return

        # --- Phase 2: Import each album ---
        imported = 0
        errors = 0
        total = len(discovered)

        for i, spotify_id in enumerate(discovered, start=1):
            # Double-check it hasn't been imported by a concurrent process / earlier run
            if Album.objects.filter(spotify_id=spotify_id).exists():
                continue

            try:
                album = service.get_or_create_album(spotify_id)
                song_count = album.songs.count()
                imported += 1
                self.stdout.write(
                    f"  [{imported}/{total}] {album.name} "
                    f"({song_count} tracks) — {album.artists.first() or 'Unknown'}"
                )
            except Exception as exc:
                errors += 1
                self.stdout.write(
                    self.style.WARNING(f"  [skip] {spotify_id}: {exc}")
                )

            if i < total:
                time.sleep(delay)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Imported {imported} albums, {errors} errors."
            )
        )

    def _discover_album_ids(self, service, target, search_delay):
        """
        Run paginated searches across DEFAULT_QUERIES and collect unique album IDs
        that are not already stored in the DB. Stops once `target` IDs are gathered.
        """
        existing_ids = set(Album.objects.values_list("spotify_id", flat=True))
        discovered = []
        seen = set(existing_ids)  # avoid duplicates within this run

        for query in DEFAULT_QUERIES:
            if len(discovered) >= target:
                break

            self.stdout.write(f'  Searching: "{query}"')

            for page in range(MAX_PAGES_PER_QUERY):
                if len(discovered) >= target:
                    break

                offset = page * SEARCH_LIMIT
                # Spotify caps offset+limit at 1000
                if offset + SEARCH_LIMIT > 1000:
                    break

                try:
                    results = service.search(
                        query,
                        types=["album"],
                        limit=SEARCH_LIMIT,
                        offset=offset,
                    )
                except Exception as exc:
                    self.stdout.write(
                        self.style.WARNING(f"    Search error (offset={offset}): {exc}")
                    )
                    break

                items = results.get("albums", {}).get("items", []) if results else []
                if not items:
                    break  # No more results for this query

                new_on_page = 0
                for item in items:
                    if item is None:
                        continue
                    sid = item.get("id")
                    if sid and sid not in seen:
                        seen.add(sid)
                        discovered.append(sid)
                        new_on_page += 1

                self.stdout.write(
                    f"    page {page + 1}: {len(items)} results, "
                    f"{new_on_page} new (total discovered: {len(discovered)})"
                )

                # If fewer results than limit, we've reached the end of this query
                if len(items) < SEARCH_LIMIT:
                    break

                time.sleep(search_delay)

        return discovered[:target]
