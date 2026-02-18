import { Stack } from 'expo-router';
import { sharedStackOptions } from '@/lib/navigation';

export default function FeedLayout() {
  return (
    <Stack screenOptions={sharedStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
