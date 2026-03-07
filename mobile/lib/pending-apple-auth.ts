/**
 * Temporary store for Apple Sign In state during the username-selection
 * onboarding flow. Cleared immediately after registration completes.
 *
 * Held in memory only — never persisted. If the user kills the app
 * mid-onboarding, this resets to null and they tap the Apple button again.
 *
 * Mirrors the onboarding-store.ts pattern.
 */

export interface PendingAppleAuth {
  /** Raw identity token from Apple — re-sent to backend for server-side verification */
  identityToken: string;
  /** Stable Apple user ID returned by the backend AppleSignInView */
  appleUid: string;
  /** Email from Apple (may be a privaterelay.appleid.com address, may be empty on re-auth) */
  email: string;
  /** Name components — only populated on the very first Apple authorization */
  fullName: { givenName: string; familyName: string };
}

let _pending: PendingAppleAuth | null = null;

export const pendingAppleAuth = {
  set(data: PendingAppleAuth): void {
    _pending = data;
  },
  get(): PendingAppleAuth | null {
    return _pending;
  },
  clear(): void {
    _pending = null;
  },
};
