import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import type { User } from '@/types/api';

export function useAvatarUpload(refreshUser: () => Promise<void>) {
  const [avatarLoading, setAvatarLoading] = useState(false);

  async function pickAndUploadAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo access in Settings to change your profile photo.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    setAvatarLoading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';

      const { upload_url, public_url } = await apiFetch<{
        upload_url: string;
        public_url: string;
      }>('/api/v1/auth/avatar/upload-url/', {
        method: 'POST',
        body: JSON.stringify({ content_type: mimeType }),
      });

      const imageResponse = await fetch(asset.uri);
      const blob = await imageResponse.blob();
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });
      if (!uploadResponse.ok) throw new Error('Upload to R2 failed');

      await apiFetch<User>('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: public_url }),
      });

      await refreshUser();

      if (process.env.EXPO_OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Failed to update photo. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  }

  async function removeAvatar() {
    setAvatarLoading(true);
    try {
      await apiFetch<User>('/api/v1/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: null }),
      });
      await refreshUser();
    } catch {
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  }

  return { avatarLoading, pickAndUploadAvatar, removeAvatar };
}
