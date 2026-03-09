import { requireNativeModule } from 'expo-modules-core';

const AppleMusicKit = requireNativeModule('AppleMusicKit');

export type AuthorizationStatus = 'authorized' | 'denied' | 'restricted' | 'notDetermined';

/** Prompt the user for Apple Music / media library access. */
export function requestAuthorization(): Promise<AuthorizationStatus> {
  return AppleMusicKit.requestAuthorization();
}

/**
 * Exchange a developer token for a Music-User-Token via SKCloudServiceController.
 * Must be called after `requestAuthorization()` returns "authorized".
 */
export function getMusicUserToken(developerToken: string): Promise<string> {
  return AppleMusicKit.getMusicUserToken(developerToken);
}
