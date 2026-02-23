import { Stack } from 'expo-router';
import { sharedStackOptions, rateScreenOptions } from '@/lib/navigation';

type TabStackLayoutProps = {
  indexTitle: string;
  children?: React.ReactNode;
};

export default function TabStackLayout({ indexTitle, children }: TabStackLayoutProps) {
  return (
    <Stack screenOptions={sharedStackOptions}>
      <Stack.Screen name="index" options={{ title: indexTitle }} />
      {children}
      <Stack.Screen name="album/[id]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="track/[id]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="artist/[id]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="user/[username]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="review/[id]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="rate" options={rateScreenOptions} />
    </Stack>
  );
}
