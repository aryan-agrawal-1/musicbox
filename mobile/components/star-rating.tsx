import { useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
// Hoisted — never changes, no need to recreate per render
const SPRING = { damping: 25, stiffness: 600 };

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
  scale: { value: number };
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

export function getRatingLabel(rating: number): string {
  if (rating === 0) return 'Tap to rate';
  if (rating === 5) return 'Masterpiece';
  if (rating >= 4.5) return 'Exceptional';
  if (rating >= 4) return 'Great';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3) return 'Decent';
  if (rating >= 2) return 'Not great';
  return 'Poor';
}

export function StarRating({ value, onChange, size = 28 }: StarRatingProps) {
  const interactive = !!onChange;
  // Ref for transient drag value — avoids re-render on every move event
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

  function resetAllStars() {
    scales.forEach(s => { s.value = withSpring(1.0, SPRING); });
  }

  function pulseStar(idx: number) {
    scales.forEach((s, i) => {
      if (i !== idx) s.value = withSpring(1.0, SPRING);
    });
    scales[idx].value = withSequence(
      withSpring(1.1, SPRING),
      withSpring(1.0, SPRING),
    );
  }

  function handleTouch(absoluteX: number) {
    const x = absoluteX - rowPageX.current;
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

  // Store callbacks in refs so the memoized gesture always calls fresh closures
  // without needing to be recreated each render (advanced-event-handler-refs)
  const handleTouchRef = useRef(handleTouch);
  handleTouchRef.current = handleTouch;
  const resetAllStarsRef = useRef(resetAllStars);
  resetAllStarsRef.current = resetAllStars;

  // Memoized gesture — recreated only if `interactive` changes.
  // activeOffsetX: claim gesture after 5px horizontal movement.
  // failOffsetY: immediately fail if finger moves 5px vertically first,
  // letting the native sheet's swipe-to-dismiss take over.
  const gesture = useMemo(() => {
    if (!interactive) return Gesture.Pan();
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-5, 5])
      .failOffsetY([-5, 5])
      .onBegin((e) => {
        measureRow();
        handleTouchRef.current(e.absoluteX);
      })
      .onUpdate((e) => {
        handleTouchRef.current(e.absoluteX);
      })
      .onFinalize(() => {
        resetAllStarsRef.current();
      });
  }, [interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  const starRow = (
    <View
      ref={rowRef}
      onLayout={interactive ? measureRow : undefined}
      style={{ flexDirection: 'row', gap: STAR_GAP }}
    >
      {([1, 2, 3, 4, 5] as const).map((star, i) => {
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return <Star key={star} fill={fill} size={size} scale={scales[i]} />;
      })}
    </View>
  );

  if (!interactive) return starRow;
  return <GestureDetector gesture={gesture}>{starRow}</GestureDetector>;
}
