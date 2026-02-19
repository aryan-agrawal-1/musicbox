type RatingCallback = (spotifyId: string, songId: number, rating: number) => void;

let _cb: RatingCallback | null = null;

export const onboardingStore = {
  setRatingCallback(cb: RatingCallback) {
    _cb = cb;
  },
  clearRatingCallback() {
    _cb = null;
  },
  fireRating(spotifyId: string, songId: number, rating: number) {
    _cb?.(spotifyId, songId, rating);
  },
};
