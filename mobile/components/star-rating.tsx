import { useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}

const STAR_GAP = 4;

function computeRating(x: number, starWidth: number): number {
  const slotWidth = starWidth + STAR_GAP;
  const totalWidth = 5 * starWidth + 4 * STAR_GAP;
  const clamped = Math.max(0, Math.min(x, totalWidth));
  const slotIndex = Math.min(4, Math.floor(clamped / slotWidth));
  const posInSlot = clamped - slotIndex * slotWidth;
  if (posInSlot >= starWidth) return slotIndex + 1;
  return posInSlot < starWidth / 2 ? slotIndex + 0.5 : slotIndex + 1;
}

// Individual star so hooks are called at top level (not inside a map)
function Star({
  fill,
  size,
  scale,
}: {
  fill: number;
  size: number;
  scale: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
      <Text
        style={{
          fontSize: size,
          position: 'absolute',
          color: 'rgba(255, 255, 255, 0.18)',
          lineHeight: size,
        }}
      >
        ★
      </Text>
      {fill > 0 && (
        <View style={{ position: 'absolute', width: size * fill, overflow: 'hidden' }}>
          <Text style={{ fontSize: size, color: Colors.accent, lineHeight: size }}>★</Text>
        </View>
      )}
    </Animated.View>
  );
}

export function StarRating({ value, onChange, size = 28 }: StarRatingProps) {
  const interactive = !!onChange;
  const lastRating = useRef(value);
  const rowRef = useRef<View>(null);
  const rowPageX = useRef(0);

  // All five shared values declared at top level — no hooks in loops
  const s0 = useSharedValue(1);
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const s3 = useSharedValue(1);
  const s4 = useSharedValue(1);
  const scales = [s0, s1, s2, s3, s4];

  function measureRow() {
    rowRef.current?.measure((_x, _y, _w, _h, pageX) => {
      rowPageX.current = pageX;
    });
  }

  const spring = { damping: 25, stiffness: 600 };

  function resetAllStars() {
    scales.forEach(s => { s.value = withSpring(1.0, spring); });
  }

  function pulseStar(idx: number) {
    // Immediately return all other stars to 1.0, cancelling any in-flight animations
    scales.forEach((s, i) => {
      if (i !== idx) s.value = withSpring(1.0, spring);
    });
    scales[idx].value = withSequence(
      withSpring(1.1, spring),
      withSpring(1.0, spring),
    );
  }

  function handleTouch(pageX: number) {
    const x = pageX - rowPageX.current;
    const next = computeRating(x, size);
    if (next !== lastRating.current) {
      const starIdx = Math.ceil(next) - 1;
      if (starIdx >= 0 && starIdx < 5) pulseStar(starIdx);
      lastRating.current = next;
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onChange!(next);
    }
  }

  const responderProps = interactive
    ? {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: { nativeEvent: { pageX: number } }) => {
          measureRow();
          handleTouch(e.nativeEvent.pageX);
        },
        onResponderMove: (e: { nativeEvent: { pageX: number } }) => {
          handleTouch(e.nativeEvent.pageX);
        },
        // Guarantee all stars return to 1.0 when the finger lifts or gesture is cancelled
        onResponderRelease: resetAllStars,
        onResponderTerminate: resetAllStars,
      }
    : {};

  return (
    <View
      ref={rowRef}
      onLayout={interactive ? measureRow : undefined}
      style={{ flexDirection: 'row', gap: STAR_GAP }}
      {...responderProps}
    >
      {([1, 2, 3, 4, 5] as const).map((star, i) => {
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return (
          <Star key={star} fill={fill} size={size} scale={scales[i]} />
        );
      })}
    </View>
  );
}
