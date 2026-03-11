export type ReviewShareData = {
  songOrAlbumName: string;
  artistName: string;
  albumImage: string | null;
  ratingValue: number;
  reviewText: string;
  username: string;
  avatarUrl: string | null;
  type: 'album' | 'song';
};

export type OnboardingTrackData = {
  songName: string;
  albumImage: string | null;
  rating: number;
};
