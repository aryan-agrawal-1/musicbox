/**
 * Lightweight cross-screen signal: the rate sheet sets share metadata after a
 * successful save so that the album/track detail screen can react on focus.
 */
export type ShareSignalPayload = {
  id: string;
  type: 'album' | 'track';
  reviewText: string;
};

export const shareSignal = {
  _pending: null as ShareSignalPayload | null,

  set(payload: ShareSignalPayload) {
    this._pending = payload;
  },

  /** Returns the payload and clears it if the pending target matches. */
  consume(id: string, type: ShareSignalPayload['type']): ShareSignalPayload | null {
    if (this._pending?.id === id && this._pending.type === type) {
      const payload = this._pending;
      this._pending = null;
      return payload;
    }
    return null;
  },
};
