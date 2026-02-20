import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';

interface RatingBadgeProps {
  rating: number;
  size?: 'small' | 'large';
}

export function RatingBadge({ rating, size = 'small' }: RatingBadgeProps) {
  const isLarge = size === 'large';
  return (
    <View
      style={{
        backgroundColor: Colors.accentDim,
        borderRadius: 100,
        borderCurve: 'continuous',
        paddingHorizontal: isLarge ? 10 : 8,
        paddingVertical: isLarge ? 4 : 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: isLarge ? 17 : 12,
          fontWeight: '600',
          color: Colors.accent,
          fontVariant: ['tabular-nums'],
        }}
      >
        {rating.toFixed(1)} ★
      </Text>
    </View>
  );
}
