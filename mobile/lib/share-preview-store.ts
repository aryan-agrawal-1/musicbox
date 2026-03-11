import type { OnboardingTrackData, ReviewShareData } from '@/types/share';

export type SharePreviewPayload =
  | { variant: 'review'; data: ReviewShareData }
  | { variant: 'onboarding'; tracks: OnboardingTrackData[] };

const payloads = new Map<string, SharePreviewPayload>();

let nextId = 0;

export const sharePreviewStore = {
  set(payload: SharePreviewPayload) {
    nextId += 1;
    const id = String(nextId);
    payloads.set(id, payload);
    return id;
  },

  get(id: string | null | undefined) {
    if (!id) return null;
    return payloads.get(id) ?? null;
  },

  clear(id: string | null | undefined) {
    if (!id) return;
    payloads.delete(id);
  },
};
