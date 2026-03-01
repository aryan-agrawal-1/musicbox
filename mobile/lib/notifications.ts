import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { router } from 'expo-router';

// How notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Expo push tokens only work on physical devices
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing !== 'granted'
      ? (await Notifications.requestPermissionsAsync()).status
      : existing;

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('[notifications] Missing EAS projectId in app.json extra.eas.projectId');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export async function syncPushToken(token: string): Promise<void> {
  try {
    await apiFetch('/api/v1/notifications/device-token/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.error('[notifications] syncPushToken failed', e);
  }
}

export async function removePushToken(token: string): Promise<void> {
  try {
    await apiFetch('/api/v1/notifications/device-token/', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.error('[notifications] removePushToken failed', e);
  }
}

// ── Deep link routing ─────────────────────────────────────────────────────────

type NotifData = {
  type: string;
  username?: string;
  review_id?: string;
  review_type?: 'album' | 'song';
};

export function handleNotificationTap(notification: Notifications.Notification): void {
  const data = notification.request.content.data as NotifData;
  if (!data?.type) return;

  switch (data.type) {
    case 'new_follower':
      if (data.username) {
        router.push(`/(shared)/user/${data.username}` as never);
      }
      break;

    case 'review_liked':
      if (data.review_id && data.review_type) {
        router.push({
          pathname: '/(shared)/review/[id]',
          params: { id: data.review_id, type: data.review_type },
        } as never);
      }
      break;

    case 'comment_on_review':
    case 'reply_to_comment':
    case 'comment_liked':
      if (data.review_id && data.review_type) {
        router.push({
          pathname: '/(shared)/review/comments',
          params: { reviewId: data.review_id, type: data.review_type },
        } as never);
      }
      break;
  }
}

// Handle the notification that launched the app from a killed/background state
export async function handleLastNotificationResponse(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    handleNotificationTap(response.notification);
  }
}
