import { Stack } from 'expo-router';
import TabStackLayout from '@/lib/tab-stack-layout';

export default function ProfileLayout() {
  return (
    <TabStackLayout indexTitle="Profile">
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitle: false }} />
      <Stack.Screen name="following" options={{ title: 'Following', headerLargeTitle: false }} />
      <Stack.Screen name="followers" options={{ title: 'Followers', headerLargeTitle: false }} />
    </TabStackLayout>
  );
}
