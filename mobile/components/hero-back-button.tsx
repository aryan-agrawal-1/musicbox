import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

export function HeroBackButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 8,
      }}
    >
      <GlassView
        isInteractive
        style={{ width: 48, height: 48, borderRadius: 32, overflow: 'hidden' }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Image
            source="sf:chevron.left"
            style={{ width: 24, height: 24 }}
            tintColor={Colors.textPrimary}
          />
        </Pressable>
      </GlassView>
    </View>
  );
}
