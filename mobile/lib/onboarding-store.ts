type RatingCallback = (songId: number, rating: number) => void;

let _cb: RatingCallback | null = null;

export const onboardingStore = {
  setRatingCallback(cb: RatingCallback) {
    _cb = cb;
  },
  clearRatingCallback() {
    _cb = null;
  },
  fireRating(songId: number, rating: number) {
    _cb?.(songId, rating);
  },
};
