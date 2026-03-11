import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  OnboardingShareCard,
  ONBOARDING_CARD_SIZE,
  ReviewShareCard,
  REVIEW_CARD_HEIGHT,
  REVIEW_CARD_WIDTH,
} from '@/components/share-card';
import { Colors } from '@/constants/colors';
import { sharePreviewStore } from '@/lib/share-preview-store';

export default function SharePreviewScreen() {
  const { shareId } = useLocalSearchParams<{ shareId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const payload = sharePreviewStore.get(shareId);
  const isReview = payload?.variant === 'review';

  const cardWidth = isReview ? REVIEW_CARD_WIDTH : ONBOARDING_CARD_SIZE;
  const cardHeight = isReview ? REVIEW_CARD_HEIGHT : ONBOARDING_CARD_SIZE;
  const previewScale = Math.min(0.76, (width - 72) / cardWidth);

  useEffect(() => {
    return () => {
      sharePreviewStore.clear(shareId);
    };
  }, [shareId]);

  function handleDone() {
    sharePreviewStore.clear(shareId);
    router.back();
  }

  async function handleShare() {
    if (!viewShotRef.current || !payload) return;
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsCapturing(true);
    let uri: string | undefined;
    let didDismiss = false;

    try {
      const capturedUri = await (viewShotRef.current as any).capture() as string;
      uri = capturedUri;
      setIsCapturing(false);
      didDismiss = true;
      sharePreviewStore.clear(shareId);
      router.back();

      if (process.env.EXPO_OS === 'ios') {
        await Share.share({ url: capturedUri, message: 'Check out my review on noted!' });
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(capturedUri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your review',
          });
        } else {
          await Share.share({ message: 'Check out my review on noted!' });
        }
      }
    } catch {
      // User cancelled or capture failed.
    } finally {
      if (uri) {
        try { new File(uri).delete(); } catch {}
      }
      if (!didDismiss) {
        setIsCapturing(false);
      }
    }
  }

  return (
    <>
      <Stack.Screen />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          justifyContent: 'space-between',
          gap: 18,
        }}
      >
        <GlassView style={{ borderRadius: 32, overflow: 'hidden' }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 18,
              paddingBottom: 16,
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                width: cardWidth * previewScale,
                height: cardHeight * previewScale,
                overflow: 'hidden',
                borderRadius: 24 * previewScale,
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
              }}
            >
              <View
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: [{ scale: previewScale }],
                  // @ts-ignore RN transformOrigin support.
                  transformOrigin: 'top left',
                }}
              >
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                  {payload?.variant === 'review' ? (
                    <ReviewShareCard data={payload.data} />
                  ) : payload?.variant === 'onboarding' ? (
                    <OnboardingShareCard tracks={payload.tracks} />
                  ) : (
                    <View
                      style={{
                        width: ONBOARDING_CARD_SIZE,
                        height: ONBOARDING_CARD_SIZE,
                        backgroundColor: Colors.surface,
                      }}
                    />
                  )}
                </ViewShot>
              </View>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              {payload
                ? 'Share the image to post it or save it to your photos.'
                : 'This share preview is no longer available.'}
            </Text>
          </View>
        </GlassView>

        <GlassView style={{ borderRadius: 28, overflow: 'hidden' }}>
          <View style={{ padding: 14, gap: 12 }}>
            <Pressable
              onPress={handleShare}
              disabled={!payload || isCapturing}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 14,
                borderCurve: 'continuous',
                backgroundColor: Colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !payload || isCapturing ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              {isCapturing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>
                  Share
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDone}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 14,
                borderCurve: 'continuous',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.textPrimary }}>
                Done
              </Text>
            </Pressable>
          </View>
        </GlassView>
      </ScrollView>
    </>
  );
}
