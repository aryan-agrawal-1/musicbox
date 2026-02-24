export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  is_spotify_connected: boolean;
  spotify_user_id: string | null;
  spotify_connected_at: string | null;
  followers_count: number;
  following_count: number;
  total_albums_rated: number;
  total_songs_rated: number;
  total_reviews: number;
}

export interface Artist {
  spotify_id: string;
  name: string;
  image_url: string | null;
  genres: string[];
}

export interface Album {
  id: number;
  spotify_id: string;
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
  spotify_id: string;
  name: string;
  artists: Artist[];
  album_name: string;
  album_image: string | null;
  album_spotify_id: string;
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
  album_spotify_id: string;
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
  album_spotify_id: string;
  rating: number | null; // rating ID
  rating_value: number | null;
  content: string; // NOTE: "content" not "text"
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface SongRating {
  id: number;
  user: User;
  song: number;
  song_name: string;
  song_spotify_id: string;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface SongReview {
  id: number;
  user: User;
  song: number;
  song_name: string;
  album_name: string;
  album_image: string | null;
  album_spotify_id: string;
  rating: number | null;
  rating_value: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedActivity {
  id: number;
  user: User;
  activity_type: 'album_rating' | 'song_rating' | 'album_review' | 'song_review' | 'follow';
  activity_data: Record<string, unknown>; // nested object varies by type
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
  spotify_id: string;
  name: string;
  image_url: string | null;
  genres: string[];
  avg_rating: number | null;
  total_ratings: number;
  albums: Album[];
}
