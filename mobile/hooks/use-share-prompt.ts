import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { shareSignal } from '@/lib/share-signal';

export function useSharePrompt(id: string, type: 'album' | 'track') {
  const [sharePrompt, setSharePrompt] = useState(false);
  const [shareReviewText, setShareReviewText] = useState<string | null>(null);
  const fillWidth = useSharedValue(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedPromptFillRef = useRef(false);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const resetFill = useCallback(() => {
    cancelAnimation(fillWidth);
    clearResetTimer();
    hasStartedPromptFillRef.current = false;
    setSharePrompt(false);
    fillWidth.value = 0;
  }, [clearResetTimer, fillWidth]);

  const startPromptAnimation = useCallback((width: number) => {
    clearResetTimer();
    fillWidth.value = 0;
    fillWidth.value = withTiming(width, { duration: 4000, easing: Easing.linear });
    resetTimerRef.current = setTimeout(resetFill, 6000);
  }, [clearResetTimer, fillWidth, resetFill]);

  const enterSharePrompt = useCallback((reviewText = '') => {
    setShareReviewText(reviewText);
    hasStartedPromptFillRef.current = false;
    setSharePrompt(true);
  }, []);

  useEffect(() => {
    return () => {
      clearResetTimer();
      cancelAnimation(fillWidth);
    };
  }, [clearResetTimer, fillWidth]);

  useFocusEffect(useCallback(() => {
    if (id) {
      const pendingShare = shareSignal.consume(id, type);
      if (pendingShare) {
        enterSharePrompt(pendingShare.reviewText);
      }
    }
  }, [id, type, enterSharePrompt]));

  return {
    sharePrompt,
    shareReviewText,
    fillStyle,
    hasStartedPromptFillRef,
    resetFill,
    startPromptAnimation,
  };
}
