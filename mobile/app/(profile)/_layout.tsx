import { Stack } from 'expo-router';
import TabStackLayout from '@/lib/tab-stack-layout';

export default function ProfileLayout() {
  return (
    <TabStackLayout indexTitle="Profile">
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitle: false }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1.0],
          headerLargeTitle: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="change-username"
        options={{
          title: 'Change Username',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 1.0],
          headerLargeTitle: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="change-email"
        options={{
          title: 'Change Email',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 1.0],
          headerLargeTitle: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Change Password',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1.0],
          headerLargeTitle: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="following" options={{ title: 'Following', headerLargeTitle: false }} />
      <Stack.Screen name="followers" options={{ title: 'Followers', headerLargeTitle: false }} />
    </TabStackLayout>
  );
}
