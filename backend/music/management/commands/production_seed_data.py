from django.core.management.base import BaseCommand

from music.services.apple_music_service import (
    APPLE_MUSIC_CHARTS_MAX_LIMIT,
    AppleMusicService,
)

GENRE_NAMES = {
    '14': 'Pop',
    '18': 'Hip-Hop/Rap',
    '21': 'Rock',
    '15': 'R&B/Soul',
    '11': 'Electronic',
    '6': 'Country',
}


class Command(BaseCommand):
    help = 'Seed production database with popular music from Apple Music charts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--storefront', default='us',
            help='Apple Music storefront/region (default: us)',
        )
        parser.add_argument(
            '--limit', type=int, default=200,
            help=(
                f'Number of albums and songs to fetch per chart '
                f'(max {APPLE_MUSIC_CHARTS_MAX_LIMIT} per Apple Music API request, default: 25)'
            ),
        )
        parser.add_argument(
            '--genres', nargs='+', default=list(GENRE_NAMES.keys()),
            metavar='GENRE_ID',
            help=(
                'Apple Music genre IDs to pull charts for '
                '(default: 14 18 21 15 11 6  —  Pop, Hip-Hop, Rock, R&B, Electronic, Country)'
            ),
        )
        parser.add_argument(
            '--no-overall', action='store_true',
            help='Skip the overall (no-genre) top charts pass',
        )

    def handle(self, *args, **options):
        storefront = options['storefront']
        limit = min(options['limit'], APPLE_MUSIC_CHARTS_MAX_LIMIT)
        genres = options['genres']
        skip_overall = options['no_overall']

        service = AppleMusicService()

        try:
            service.generate_developer_token()
        except ValueError as exc:
            self.stderr.write(self.style.ERROR(f'Apple Music credentials not configured: {exc}'))
            return

        total_albums = 0
        total_songs = 0
        total_albums_existing = 0
        total_songs_existing = 0

        passes = []
        if not skip_overall:
            passes.append((None, 'Overall'))
        for genre_id in genres:
            passes.append((genre_id, GENRE_NAMES.get(genre_id, f'Genre {genre_id}')))

        for genre_id, genre_name in passes:
            self.stdout.write(f'\nFetching {genre_name} charts (storefront={storefront}, limit={limit})...')
            try:
                results = service.get_charts(storefront=storefront, limit=limit, genre_id=genre_id)
            except Exception as exc:
                self.stderr.write(self.style.WARNING(f'  Chart fetch failed for {genre_name}: {exc}'))
                continue

            # --- Albums from charts ---
            album_chart_entries = results.get('albums', [])
            chart_albums = album_chart_entries[0].get('data', []) if album_chart_entries else []
            self.stdout.write(f'  Processing {len(chart_albums)} chart albums...')

            for album_dict in chart_albums:
                album_name = album_dict.get('attributes', {}).get('name', '?')
                try:
                    album, songs_created = service.create_album_from_apple(album_dict, storefront)
                    if songs_created > 0:
                        total_albums += 1
                        total_songs += songs_created
                        self.stdout.write(
                            f'    + {album_name} ({songs_created} tracks)'
                        )
                    else:
                        total_albums_existing += 1
                except Exception as exc:
                    self.stderr.write(self.style.WARNING(f'    ! {album_name}: {exc}'))

            # --- Songs from charts (may include albums not in the album chart) ---
            song_chart_entries = results.get('songs', [])
            chart_songs = song_chart_entries[0].get('data', []) if song_chart_entries else []
            self.stdout.write(f'  Processing {len(chart_songs)} chart songs...')

            for track in chart_songs:
                attrs = track.get('attributes', {})
                track_name = attrs.get('name', '?')
                artist_name = attrs.get('artistName', '')
                album_name = attrs.get('albumName', '')
                am_id = track.get('id', '')

                try:
                    # Check if already imported
                    from music.models import Song
                    if am_id and Song.objects.filter(apple_music_id=am_id).exists():
                        total_songs_existing += 1
                        continue

                    # Resolve album for this song — try by albumId relationship first
                    relationships = track.get('relationships', {})
                    albums_rel = relationships.get('albums', {}).get('data', [])
                    album_obj = None

                    if albums_rel:
                        am_album_id = albums_rel[0].get('id')
                        if am_album_id:
                            # Try to get the full album (creates it if needed)
                            full_album_dict = service.get_album_with_tracks(am_album_id, storefront)
                            if full_album_dict:
                                album_obj, songs_created = service.create_album_from_apple(
                                    full_album_dict, storefront
                                )
                                total_songs += songs_created

                    if not album_obj:
                        # Fallback: minimal album from song attributes
                        artwork = attrs.get('artwork', {})
                        image_url = None
                        if artwork.get('url'):
                            image_url = artwork['url'].replace('{w}', '500').replace('{h}', '500')
                        album_obj = service._get_or_create_apple_album(
                            album_name=album_name,
                            artist_name=artist_name,
                            am_album_id=None,
                            image_url=image_url,
                            release_date=attrs.get('releaseDate', ''),
                        )

                    _, created = service.create_song_from_apple_track(track, album_obj)
                    if created:
                        total_songs += 1
                        self.stdout.write(f'    + {track_name} — {artist_name}')
                    else:
                        total_songs_existing += 1

                except Exception as exc:
                    self.stderr.write(self.style.WARNING(f'    ! {track_name}: {exc}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {total_albums} albums, {total_songs} songs. '
            f'({total_albums_existing} albums and {total_songs_existing} songs already existed)'
        ))
