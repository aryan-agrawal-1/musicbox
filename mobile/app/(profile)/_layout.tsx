import { Stack } from 'expo-router';
import { sharedStackOptions } from '@/lib/navigation';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={sharedStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitle: false }} />
      <Stack.Screen name="following" options={{ title: 'Following', headerLargeTitle: false }} />
      <Stack.Screen name="followers" options={{ title: 'Followers', headerLargeTitle: false }} />
    </Stack>
  );
}
