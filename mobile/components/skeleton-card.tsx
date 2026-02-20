import type { DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonCardProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
}

export function SkeletonCard({ width = '100%', height, borderRadius = 8 }: SkeletonCardProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#1C1C1E', '#2A2A2E'],
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          borderCurve: 'continuous',
        },
        animatedStyle,
      ]}
    />
  );
}
