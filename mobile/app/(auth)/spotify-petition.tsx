import { useRouter } from 'expo-router';
import { SpotifyPetitionSheet } from '@/components/spotify-petition-sheet';

export default function SpotifyPetitionRoute() {
  const router = useRouter();
  return <SpotifyPetitionSheet onClose={() => router.back()} />;
}
