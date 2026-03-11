import { Stack } from 'expo-router';
import { sharedStackOptions, sharePreviewScreenOptions } from '@/lib/navigation';

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ ...sharedStackOptions, headerLargeTitle: false }}>
      <Stack.Screen name="album/[id]" />
      <Stack.Screen name="track/[id]" />
      <Stack.Screen name="artist/[id]" />
      <Stack.Screen name="user/[username]" options={{ headerShown: false }} />
      <Stack.Screen name="review/[id]" />
      <Stack.Screen
        name="review/comments"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="rate"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.55, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen name="share-preview" options={sharePreviewScreenOptions} />
    </Stack>
  );
}
