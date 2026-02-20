import { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { Stack } from 'expo-router';

import { Colors } from '@/constants/colors';
import { SectionHeader } from '@/components/section-header';
import { AlbumCard } from '@/components/album-card';
import { TrackRow } from '@/components/track-row';
import { StarRating } from '@/components/star-rating';
import { RatingBadge } from '@/components/rating-badge';
import { AvatarImage } from '@/components/avatar-image';
import { UserRow } from '@/components/user-row';
import { ReviewCard } from '@/components/review-card';
import { ActivityCard } from '@/components/activity-card';
import { SkeletonCard } from '@/components/skeleton-card';

import type { Album, Song, User, AlbumReview, FeedActivity, Artist } from '@/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ARTIST: Artist = {
  spotify_id: 'art1',
  name: 'Kendrick Lamar',
  image_url: null,
  genres: ['hip-hop'],
};

const MOCK_ALBUMS: Album[] = [
  {
    spotify_id: 'alb1',
    name: 'GNX',
    release_date: '2024-11-22',
    image_url: null,
    artists: [MOCK_ARTIST],
    album_type: 'album',
    total_tracks: 12,
    genres: ['hip-hop'],
    avg_rating: 4.8,
    total_ratings: 3200,
    popularity_score: 15360,
  },
  {
    spotify_id: 'alb2',
    name: 'To Pimp a Butterfly',
    release_date: '2015-03-15',
    image_url: null,
    artists: [MOCK_ARTIST],
    album_type: 'album',
    total_tracks: 16,
    genres: ['hip-hop'],
    avg_rating: 4.9,
    total_ratings: 8400,
    popularity_score: 41160,
  },
  {
    spotify_id: 'alb3',
    name: 'DAMN.',
    release_date: '2017-04-14',
    image_url: null,
    artists: [MOCK_ARTIST],
    album_type: 'album',
    total_tracks: 14,
    genres: ['hip-hop'],
    avg_rating: 4.7,
    total_ratings: 6100,
    popularity_score: 28670,
  },
];

const MOCK_SONGS: Song[] = [
  {
    spotify_id: 'trk1',
    name: 'squabble up',
    artists: [MOCK_ARTIST],
    album_name: 'GNX',
    album_image: null,
    album_spotify_id: 'alb1',
    track_number: 1,
    disc_number: 1,
    duration_ms: 195000,
    explicit: true,
    preview_url: null,
    avg_rating: 4.6,
    total_ratings: 940,
  },
  {
    spotify_id: 'trk2',
    name: 'Luther',
    artists: [MOCK_ARTIST],
    album_name: 'GNX',
    album_image: null,
    album_spotify_id: 'alb1',
    track_number: 2,
    disc_number: 1,
    duration_ms: 227000,
    explicit: false,
    preview_url: null,
    avg_rating: 4.9,
    total_ratings: 1820,
  },
  {
    spotify_id: 'trk3',
    name: 'man at the garden',
    artists: [MOCK_ARTIST],
    album_name: 'GNX',
    album_image: null,
    album_spotify_id: 'alb1',
    track_number: 3,
    disc_number: 1,
    duration_ms: 181000,
    explicit: true,
    preview_url: null,
    avg_rating: null,
    total_ratings: 0,
  },
];

const MOCK_USERS: User[] = [
  {
    id: 1,
    username: 'aryan',
    first_name: 'Aryan',
    last_name: 'A',
    email: 'aryan@example.com',
    bio: null,
    avatar_url: null,
    is_spotify_connected: true,
    spotify_user_id: null,
    spotify_connected_at: null,
    followers_count: 142,
    following_count: 88,
    total_albums_rated: 320,
    total_songs_rated: 1200,
    total_reviews: 45,
  },
  {
    id: 2,
    username: 'jess_music',
    first_name: 'Jessica',
    last_name: 'Lin',
    email: 'jess@example.com',
    bio: null,
    avatar_url: null,
    is_spotify_connected: false,
    spotify_user_id: null,
    spotify_connected_at: null,
    followers_count: 67,
    following_count: 104,
    total_albums_rated: 210,
    total_songs_rated: 780,
    total_reviews: 22,
  },
];

const MOCK_REVIEW: AlbumReview = {
  id: 1,
  user: MOCK_USERS[0],
  album: 1,
  album_name: 'GNX',
  album_image: null,
  rating: 1,
  rating_value: 4.8,
  content:
    "Kendrick doesn't miss. The production here is layered in a way that reveals something new on every listen. \"Luther\" is an instant classic.",
  likes_count: 38,
  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_ACTIVITIES: FeedActivity[] = [
  {
    id: 1,
    user: MOCK_USERS[0],
    activity_type: 'album_rating',
    activity_data: {
      album_name: 'GNX',
      artist_name: 'Kendrick Lamar',
      album_image: null,
      rating: 4.8,
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    user: MOCK_USERS[1],
    activity_type: 'album_review',
    activity_data: {
      album_name: 'To Pimp a Butterfly',
      artist_name: 'Kendrick Lamar',
      album_image: null,
      rating: 5.0,
      content:
        'A complete sonic universe — jazz, funk, spoken word, and pure poetry. One of the greatest records ever made.',
    },
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    user: MOCK_USERS[0],
    activity_type: 'follow',
    activity_data: {
      followed_name: 'Jessica Lin',
      followed_username: 'jess_music',
      followed_avatar: null,
    },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const [interactiveRating, setInteractiveRating] = useState(3.5);
  const [followStates, setFollowStates] = useState({ 0: false, 1: true });

  return (
    <>
      <Stack.Screen options={{ title: 'Components' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 48, gap: 32, paddingTop: 8 }}
      >

        {/* ── Section Headers ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Section Headers" />
          <SectionHeader title="With Action" action={{ label: 'See all', onPress: () => {} }} />
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ height: 1, backgroundColor: Colors.separator }} />
          </View>
        </View>

        {/* ── Album Cards — Large ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Album Cards — Large" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {MOCK_ALBUMS.map(album => (
              <View key={album.spotify_id} style={{ width: 180 }}>
                <AlbumCard album={album} variant="large" />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Album Cards — Compact (3-col) ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Album Cards — Compact" />
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8 }}>
            {MOCK_ALBUMS.map(album => (
              <View key={album.spotify_id} style={{ flex: 1 }}>
                <AlbumCard album={album} variant="compact" showRating />
              </View>
            ))}
          </View>
        </View>

        {/* ── Album Cards — Inline ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Album Cards — Inline" />
          <View style={{ paddingHorizontal: 16, gap: 2 }}>
            {MOCK_ALBUMS.slice(0, 2).map((album, i) => (
              <View key={album.spotify_id}>
                <AlbumCard album={album} variant="inline" showRating />
                {i < 1 && (
                  <View style={{ height: 1, backgroundColor: Colors.separator, marginLeft: 72 + 12 }} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── Track Rows ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Track Rows" />
          <View style={{ paddingHorizontal: 0 }}>
            {MOCK_SONGS.map((track, i) => (
              <View key={track.spotify_id}>
                <TrackRow
                  track={track}
                  userRating={i === 0 ? 4.5 : i === 1 ? 5.0 : undefined}
                />
                {i < MOCK_SONGS.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: Colors.separator,
                      marginLeft: 16 + 28 + 12,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── Star Ratings ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Star Ratings" />
          <View style={{ paddingHorizontal: 16, gap: 20 }}>
            {/* Non-interactive */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: Colors.textTertiary }}>Non-interactive — 4.5</Text>
              <StarRating value={4.5} size={28} />
            </View>
            {/* Interactive */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: Colors.textTertiary }}>
                Interactive — {interactiveRating > 0 ? interactiveRating : 'tap to rate'}
              </Text>
              <StarRating
                value={interactiveRating}
                onChange={setInteractiveRating}
                size={36}
              />
            </View>
          </View>
        </View>

        {/* ── Rating Badges ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Rating Badges" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <RatingBadge rating={3.0} />
            <RatingBadge rating={4.2} />
            <RatingBadge rating={5.0} />
            <RatingBadge rating={4.5} size="large" />
          </View>
        </View>

        {/* ── Avatar Images ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Avatar Images" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <AvatarImage uri={null} size={44} displayName="Aryan A" />
              <Text style={{ fontSize: 11, color: Colors.textTertiary }}>Initials</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <AvatarImage uri={null} size={64} displayName="Jessica Lin" />
              <Text style={{ fontSize: 11, color: Colors.textTertiary }}>Large</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <AvatarImage uri={null} size={32} displayName="K" />
              <Text style={{ fontSize: 11, color: Colors.textTertiary }}>Small</Text>
            </View>
          </View>
        </View>

        {/* ── User Rows ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="User Rows" />
          {MOCK_USERS.map((user, i) => (
            <View key={user.id}>
              <UserRow
                user={user}
                isFollowing={followStates[i as 0 | 1]}
                onFollowPress={() =>
                  setFollowStates(prev => ({ ...prev, [i]: !prev[i as 0 | 1] }))
                }
              />
              {i < MOCK_USERS.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: Colors.separator,
                    marginLeft: 16 + 44 + 12,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Review Card ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Review Card" />
          <View style={{ paddingHorizontal: 16 }}>
            <ReviewCard review={MOCK_REVIEW} />
          </View>
        </View>

        {/* ── Activity Cards ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Activity Cards" />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {MOCK_ACTIVITIES.map((activity, i) => (
              <ActivityCard key={activity.id} activity={activity} index={i} />
            ))}
          </View>
        </View>

        {/* ── Skeleton Cards ── */}
        <View style={{ gap: 0 }}>
          <SectionHeader title="Skeleton Cards" />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {/* 3-col album skeletons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ flex: 1 }}>
                  <SkeletonCard height={120} borderRadius={6} />
                </View>
              ))}
            </View>
            {/* Track row skeletons */}
            {[80, 80, 80].map((h, i) => (
              <SkeletonCard key={i} height={h} borderRadius={8} />
            ))}
          </View>
        </View>

      </ScrollView>
    </>
  );
}
