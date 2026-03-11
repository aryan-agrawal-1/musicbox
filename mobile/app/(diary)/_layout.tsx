import { Stack } from 'expo-router';
import TabStackLayout from '@/lib/tab-stack-layout';
import { spotifyPetitionScreenOptions } from '@/lib/navigation';

export default function DiaryLayout() {
  return (
    <TabStackLayout indexTitle="Diary">
      <Stack.Screen name="spotify-petition" options={spotifyPetitionScreenOptions} />
    </TabStackLayout>
  );
}
