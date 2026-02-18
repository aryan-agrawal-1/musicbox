import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ presentation: 'card' }} />
      <Stack.Screen name="register" options={{ presentation: 'card' }} />
      <Stack.Screen name="spotify-connect" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
