import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';

interface AvatarImageProps {
  uri: string | null;
  size: number;
  displayName: string;
}

export function AvatarImage({ uri, size, displayName }: AvatarImageProps) {
  const radius = size / 2;
  const initial = (displayName?.trim()?.[0] ?? '?').toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: Colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.4,
          fontWeight: '600',
          color: Colors.textSecondary,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
