import { Stack } from 'expo-router';
import { sharedStackOptions } from '@/lib/navigation';

export default function UserLayout() {
  return (
    <Stack screenOptions={{ ...sharedStackOptions, headerLargeTitle: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="followers" options={{ title: 'Followers' }} />
      <Stack.Screen name="following" options={{ title: 'Following' }} />
    </Stack>
  );
}
