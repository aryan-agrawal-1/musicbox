import { Stack } from 'expo-router';
import { sharedStackOptions } from '@/lib/navigation';

export default function DiaryLayout() {
  return (
    <Stack screenOptions={sharedStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Diary' }} />
    </Stack>
  );
}
