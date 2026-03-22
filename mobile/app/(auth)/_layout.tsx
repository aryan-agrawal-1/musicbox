import { Stack } from 'expo-router';
import { sharePreviewScreenOptions, spotifyPetitionScreenOptions } from '@/lib/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ presentation: 'card' }} />
      <Stack.Screen name="forgot-password" options={{ presentation: 'card' }} />
      <Stack.Screen name="reset-password" options={{ presentation: 'card' }} />
      <Stack.Screen name="register" options={{ presentation: 'card' }} />
      <Stack.Screen
        name="rate-song"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.55, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen name="share-preview" options={sharePreviewScreenOptions} />
      <Stack.Screen name="spotify-petition" options={spotifyPetitionScreenOptions} />
    </Stack>
  );
}
