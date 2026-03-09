export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  username_last_changed: string | null;
  is_spotify_connected: boolean;
  spotify_user_id: string | null;
  spotify_connected_at: string | null;
  is_apple_music_connected: boolean;
  apple_music_connected_at: string | null;
  followers_count: number;
  following_count: number;
  total_albums_rated: number;
  total_songs_rated: number;
  total_reviews: number;
}

export interface Artist {
  id: number;
  spotify_id: string | null;
  apple_music_id: string | null;
  name: string;
  image_url: string | null;
  genres: string[];
}

export interface Album {
  id: number;
  spotify_id: string | null;
  apple_music_id: string | null;
  name: string; // "name" not "title"
  release_date: string;
  image_url: string | null; //"image_url" not "cover_image_url"
  artists: Artist[];
  album_type: string;
  total_tracks: number;
  genres: string[];
  avg_rating: number | null;
  total_ratings: number;
  popularity_score: number;
  songs?: Song[]; // only on detail endpoint
}

export interface Song {
  // backend calls these "songs" not "tracks"
  id: number;
  spotify_id: string | null;
  apple_music_id: string | null;
  isrc: string | null;
  name: string;
  artists: Artist[];
  album_id: number;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string | null;
  track_number: number;
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  avg_rating: number | null;
  total_ratings: number;
}

export interface AlbumRating {
  id: number;
  user: User;
  album: number; // album ID (integer FK)
  album_name: string;
  album_image: string | null;
  album_spotify_id: string | null;
  rating: number; // 0.5–5.0 in 0.5 steps
  created_at: string;
  updated_at: string;
}

export interface AlbumReview {
  id: number;
  user: User;
  album: number;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string | null;
  rating: number | null; // rating ID
  rating_value: number | null;
  content: string; // NOTE: "content" not "text"
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface SongRating {
  id: number;
  user: User;
  song: number;
  song_name: string;
  song_spotify_id: string | null;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface SongReview {
  id: number;
  user: User;
  song: number;
  song_name: string;
  song_spotify_id: string | null;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string | null;
  rating: number | null;
  rating_value: number | null;
  content: string;
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumReviewComment {
  id: number;
  user: User;
  review: number;
  parent: number | null;
  content: string;
  likes_count: number;
  is_liked: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export type SongReviewComment = AlbumReviewComment; // identical shape

export interface FeedActivity {
  id: number;
  user: User;
  activity_type: 'album_rating' | 'song_rating' | 'album_review' | 'song_review' | 'follow';
  activity_data: Record<string, unknown>; // nested object varies by type
  created_at: string;
}

export interface Follow {
  id: number;
  follower: User;
  following: User;
  created_at: string;
}

export interface PushNotification {
  id: number;
  actor: Pick<User, 'id' | 'username' | 'avatar_url'>;
  notification_type:
    | 'new_follower'
    | 'review_liked'
    | 'comment_on_review'
    | 'reply_to_comment'
    | 'comment_liked';
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface ListeningHistory {
  id: number;
  song: Song;
  played_at: string;
  context_type: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ArtistDetail {
  id: number;
  spotify_id: string | null;
  apple_music_id: string | null;
  name: string;
  image_url: string | null;
  genres: string[];
  avg_rating: number | null;
  total_ratings: number;
  albums: Album[];
}
