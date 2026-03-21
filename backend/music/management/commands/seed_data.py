"""
Management command to seed the database with test data for development.

Usage:
    python manage.py seed_data
    python manage.py seed_data --users 15 --albums 20
"""

import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from music.services.spotify_service import SpotifyService
from reviews.models import AlbumRating, AlbumReview, SongRating, SongReview

User = get_user_model()

# Verified Spotify album IDs (from open.spotify.com/album/...)
SEED_ALBUMS = [
    '2fenSS68JI1h4Fo296JfGr',  # Taylor Swift - folklore
    '6dVIqQ8qmQ5GBnJ9shOYGE',  # Radiohead - OK Computer
    '6w7lqIsvDPgTChMrPw5oIL',  # Kendrick Lamar - To Pimp a Butterfly
    '0ETFjACtuP2ADo6LFhL6HN',  # The Beatles - Abbey Road (Remastered)
    '097eYvf9NKjFnv4xA9s2oV',  # Amy Winehouse - Back to Black
    '40GMAhriYJRO1rsY4YdrZb',  # Drake - Views
    '0S0KGZnfBGSIssfF54WSJh',  # Billie Eilish - WHEN WE ALL FALL ASLEEP
    '3mH6qwIy9crq0I9YQbOuDf',  # Frank Ocean - Blonde
    '20r762YmB5HeofjMCiPMLv',  # Kanye West - My Beautiful Dark Twisted Fantasy
    '78bpIziExqiI9qztvNFlQu',   # Arctic Monkeys - AM
    '1bt6q2SruMsBtcerNVtpZB',  # Fleetwood Mac - Rumours
    '4m2880jivSbbyEGAKfITCa',  # Daft Punk - Random Access Memories
    '0Lg1uZvI312TPqxNWShFXL',  # Adele - 21
    '2B87zXm9bOWvAJdkJBTpzF',  # Lorde - Melodrama
    '5XpEKORZ4y6OrCZSKsi46A',  # Lana Del Rey - Norman Fucking Rockwell!
    '4LH4d3cOWNNsVw41Gqt2kv',  # Pink Floyd - The Dark Side of the Moon
    '48D1hRORqJq52qsnUYZX56',  # David Bowie - Ziggy Stardust (2012 Remaster)
    '2guirTSEqLizK7j9i1MTTZ',  # Nirvana - Nevermind (Remastered)
    '7dK54iZuOxXFarGhXwEXfF',  # Beyonce - Lemonade
    '5zi7WsKlIiUXv09tbGLKsE',  # Tyler, the Creator - IGOR
    '1FZKIm3JVDCxTchXDo5jOV',  # Harry Styles - Harry Styles
    '4yP0hdKOZPNshxUOjY0cZj',  # The Weeknd - After Hours
    '7fJJK56U9fHixgO0HQkhtI',  # Dua Lipa - Future Nostalgia
    '2ODvWsOgouEbaA5TR0u0bF',  # Olivia Rodrigo - SOUR
]

SEED_USERS = [
    {'username': 'alice', 'email': 'alice@example.com', 'password': 'testpass123'},
    {'username': 'bob', 'email': 'bob@example.com', 'password': 'testpass123'},
    {'username': 'carol', 'email': 'carol@example.com', 'password': 'testpass123'},
    {'username': 'dave', 'email': 'dave@example.com', 'password': 'testpass123'},
    {'username': 'eve', 'email': 'eve@example.com', 'password': 'testpass123'},
    {'username': 'frank', 'email': 'frank@example.com', 'password': 'testpass123'},
    {'username': 'grace', 'email': 'grace@example.com', 'password': 'testpass123'},
    {'username': 'henry', 'email': 'henry@example.com', 'password': 'testpass123'},
    {'username': 'ivy', 'email': 'ivy@example.com', 'password': 'testpass123'},
    {'username': 'jack', 'email': 'jack@example.com', 'password': 'testpass123'},
    {'username': 'kate', 'email': 'kate@example.com', 'password': 'testpass123'},
    {'username': 'leo', 'email': 'leo@example.com', 'password': 'testpass123'},
    {'username': 'maya', 'email': 'maya@example.com', 'password': 'testpass123'},
    {'username': 'noah', 'email': 'noah@example.com', 'password': 'testpass123'},
    {'username': 'olivia', 'email': 'olivia@example.com', 'password': 'testpass123'},
]

ALBUM_REVIEW_TEMPLATES = [
    "Absolutely love this album. Every track hits different. A masterpiece from start to finish.",
    "Solid record. A few skips but the highs more than make up for it. Would recommend.",
    "Not my usual genre but I was pleasantly surprised. The production is incredible.",
    "Overhyped in my opinion. Some good moments but overall forgettable.",
    "This album changed how I think about music. The songwriting is next level.",
    "Perfect for late-night listening. Cohesive and atmospheric throughout.",
    "Been on repeat since release. Can't get enough of the melodies.",
    "Underrated gem. Deserves way more attention than it got.",
    "Classic for a reason. Holds up incredibly well years later.",
    "Hit or miss for me. The singles are great, the deep cuts less so.",
    "One of the best albums of the decade. No filler, all killer.",
    "Experimental and bold. Took a few listens to click but now I'm obsessed.",
    "Great vibes. Not groundbreaking but consistently enjoyable.",
    "The lyrics hit hard. Had me in my feelings for days.",
    "Production is immaculate. Every detail feels intentional.",
    # Long reviews for testing truncation
    (
        "I've been sitting with this album for three weeks now and I still don't feel like I've fully "
        "processed it. There's a particular kind of record that rewards patience — one that reveals new "
        "textures and meanings with each listen — and this is absolutely that kind of record. The first "
        "time through I was struck by the production: dense, layered, occasionally overwhelming, but "
        "always intentional. By the third listen I started noticing the lyrical architecture, the way "
        "certain phrases echo across tracks, how the sequencing creates this slow-burning emotional arc "
        "that doesn't fully land until the final two minutes of the closing track. I genuinely got chills. "
        "There are a couple of moments in the middle stretch where the pacing dips and I find my attention "
        "drifting, but honestly those moments feel earned in retrospect — like valleys before peaks. "
        "This is not background music. This demands your full attention and it rewards every second of it. "
        "Instant classic for me. I can't imagine this year's end-of-year lists without it at or near the top."
    ),
    (
        "Okay I need to talk about this album because I feel like people are sleeping on it. Yes, the lead "
        "single was divisive. Yes, the rollout was a mess. But the actual music? Stunning. Track 2 alone "
        "justifies the entire thing — the way the instrumental builds from almost nothing into that massive "
        "wall of sound is one of the most thrilling moments I've heard in years. Tracks 4 through 7 form "
        "this cohesive mini-suite that works incredibly well together; each one bleeds into the next and "
        "by the time you reach the midpoint you're completely lost in the world of the album. I'll admit "
        "the back half loses a little momentum — tracks 9 and 10 feel like they could've been cut without "
        "losing much — but the closer absolutely sticks the landing. It's a bold, weird, imperfect record "
        "and I love it for all of those reasons. Some albums are safe. This one swings hard, and even when "
        "it misses it's more interesting than most of what comes out in a given year. Highly recommended "
        "if you have patience and an open mind. Do not skip the liner notes."
    ),
    (
        "I want to preface this by saying I came in as a skeptic. I'd heard a lot of hype and my "
        "experience with overhyped albums is usually disappointment, so I kept my expectations low. "
        "Fifteen minutes in I had completely abandoned my skepticism. This thing is a genuinely "
        "exceptional piece of work. The production choices are unlike anything I've heard from this "
        "artist before — cleaner, more restrained, with a lot of space in the mix that lets every "
        "element breathe. The vocal performances are the best of their career, full stop. There's a "
        "rawness here that I wasn't expecting, an emotional honesty that cuts through on almost every "
        "song. Even the tracks I initially thought were weak have grown on me significantly over "
        "repeated listens. My only genuine criticism is that a couple of the collaborations feel "
        "slightly out of place tonally, like they were added for commercial appeal rather than artistic "
        "necessity. But that's a minor complaint against an otherwise remarkable body of work. This "
        "is the album I'll be pointing to when people ask what good music sounded like this year. "
        "Five stars without hesitation."
    ),
    (
        "Three listens in and I'm genuinely torn. There's so much here that I love — the production "
        "is incredible, some of the songwriting is genuinely brilliant, and a few tracks have already "
        "lodged themselves permanently in my brain. But there's also a stretch in the middle of this "
        "record where things feel like they're treading water, recycling ideas that were introduced "
        "more effectively earlier on. I get the sense that there might be a tighter, more focused "
        "album buried in here somewhere, and a more ruthless edit could have made this something truly "
        "special rather than merely very good. That said — even a slightly overlong very good album "
        "is still worth your time, and I'll absolutely keep coming back to this. The highs are high "
        "enough to carry the lows. I'm giving it four stars because when it's working, it's working "
        "at a level very few artists reach. Just wish it had been a little more disciplined."
    ),
]

SONG_REVIEW_TEMPLATES = [
    "This track is everything. The hook is stuck in my head.",
    "Underrated cut from the album. Deserves more love.",
    "Perfect opener. Sets the tone for the whole record.",
    "The bridge on this one is insane. Chills every time.",
    "Could have been a single. Catchy and memorable.",
    "Grows on you with each listen. Now one of my favorites.",
    # Long song review for testing truncation
    (
        "I've replayed this song probably forty times over the past week and I still haven't gotten tired "
        "of it. The production is immaculate — every element sits perfectly in the mix, nothing feels "
        "cluttered or out of place, and there's this subtle interplay between the bass and the kick drum "
        "that you don't consciously notice at first but which gives the whole track an almost hypnotic "
        "groove. The melody on the chorus is deceptively simple. It sounds effortless, but you can tell "
        "a lot of work went into making something that catchy feel that natural. The second verse shift "
        "in the instrumentation was an inspired choice — it re-engages you right when the track could "
        "start to feel repetitive. And the outro. That outro. It goes on just long enough to feel "
        "genuinely transportive without overstaying its welcome. If this isn't a single, whoever made "
        "the rollout decisions is out of their mind. Absolute gem."
    ),
]


class Command(BaseCommand):
    help = 'Seed the database with test users and music data'

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=15, help='Number of test users to create')
        parser.add_argument('--albums', type=int, default=20, help='Number of albums to fetch from Spotify')

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Create test users
        users = self._create_users(options['users'])

        # Fetch albums from Spotify
        albums = self._fetch_albums(options['albums'])

        if not albums:
            self.stdout.write(self.style.WARNING('No albums fetched. Check your Spotify credentials.'))
            return

        # Create random ratings
        self._create_ratings(users, albums)

        # Create album and song reviews
        self._create_reviews(users, albums)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Created {len(users)} users, {len(albums)} albums, ratings, and reviews.'
        ))

    def _create_users(self, count):
        users = []
        templates = SEED_USERS[:count]
        for data in templates:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={'email': data['email']},
            )
            if created:
                user.set_password(data['password'])
                user.save()
                self.stdout.write(f"  Created user: {user.username}")
            else:
                self.stdout.write(f"  User already exists: {user.username}")
            users.append(user)
        return users

    def _fetch_albums(self, count):
        service = SpotifyService()
        albums = []
        album_ids = SEED_ALBUMS[:count]
        for spotify_id in album_ids:
            try:
                album = service.get_or_create_album(spotify_id)
                albums.append(album)
                self.stdout.write(f"  Fetched album: {album.name}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Failed to fetch album {spotify_id}: {e}"))
        return albums

    def _create_ratings(self, users, albums):
        rating_choices = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
        for user in users:
            # Rate a random subset of albums (each user rates 40-80% of albums)
            num_to_rate = random.randint(
                max(1, len(albums) // 2),
                max(1, len(albums))
            )
            for album in random.sample(albums, k=min(len(albums), num_to_rate)):
                rating, created = AlbumRating.objects.get_or_create(
                    user=user,
                    album=album,
                    defaults={'rating': random.choice(rating_choices)},
                )
                if created:
                    self.stdout.write(f"  {user.username} rated '{album.name}': {rating.rating}")

            # Rate songs from multiple albums (3-6 songs per album for 2-4 albums)
            albums_to_rate = random.sample(albums, k=min(len(albums), random.randint(2, 4)))
            for album in albums_to_rate:
                songs = list(album.songs.all()[:6])
                for song in random.sample(songs, k=min(len(songs), random.randint(3, 6))):
                    SongRating.objects.get_or_create(
                        user=user,
                        song=song,
                        defaults={'rating': random.choice(rating_choices)},
                    )

    def _create_reviews(self, users, albums):
        for user in users:
            # Create album reviews for ~30-50% of albums the user has rated
            user_ratings = list(AlbumRating.objects.filter(user=user).select_related('album'))
            if user_ratings:
                num_reviews = max(1, len(user_ratings) // 2)
                to_review = random.sample(user_ratings, k=min(len(user_ratings), num_reviews))
                for album_rating in to_review:
                    AlbumReview.objects.get_or_create(
                        user=user,
                        album=album_rating.album,
                        defaults={
                            'content': random.choice(ALBUM_REVIEW_TEMPLATES),
                            'rating': album_rating,
                        },
                    )

            # Create song reviews for a few songs the user has rated
            user_song_ratings = list(SongRating.objects.filter(user=user).select_related('song')[:10])
            if user_song_ratings:
                num_reviews = min(len(user_song_ratings), random.randint(2, 5))
                to_review = random.sample(user_song_ratings, k=num_reviews)
                for song_rating in to_review:
                    SongReview.objects.get_or_create(
                        user=user,
                        song=song_rating.song,
                        defaults={
                            'content': random.choice(SONG_REVIEW_TEMPLATES),
                            'rating': song_rating,
                        },
                    )
