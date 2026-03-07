import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';

const SPOTIFY_BENEFITS = [
  'Import your recent listening',
  'Auto-sync new listens daily',
  'Rate tracks directly from history',
] as const;

interface SpotifyConnectPanelProps {
  title: string;
  description: string;
  isConnecting: boolean;
  loadingLabel: string;
  /** Extra line shown beneath the loading label (e.g. "This may take a moment…") */
  connectingSubtitle?: string;
  error?: string | null;
  onConnect: () => void;
  /** When provided, a "Skip for now →" link is rendered below the connect button */
  onSkip?: () => void;
}

export function SpotifyConnectPanel({
  title,
  description,
  isConnecting,
  loadingLabel,
  connectingSubtitle,
  error,
  onConnect,
  onSkip,
}: SpotifyConnectPanelProps) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
      {/* Glow */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(29, 185, 84, 0.07)',
        }}
      />

      {/* Spotify logo */}
      <Image
        source={require('@/assets/Spotify_Primary_Logo_RGB_Green.png')}
        style={{ width: 72, height: 72, marginBottom: 24 }}
        resizeMode="contain"
      />

      <Text
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: Colors.textPrimary,
          textAlign: 'center',
          letterSpacing: -0.5,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 32,
        }}
      >
        {description}
      </Text>

      {/* Benefits */}
      <View style={{ gap: 10, width: '100%', marginBottom: 40 }}>
        {SPOTIFY_BENEFITS.map(benefit => (
          <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 16, color: Colors.positive }}>✓</Text>
            <Text style={{ fontSize: 15, color: Colors.textSecondary }}>{benefit}</Text>
          </View>
        ))}
      </View>

      {error && (
        <Text
          style={{
            fontSize: 13,
            color: Colors.destructive,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      )}

      {isConnecting ? (
        <View style={{ width: '100%', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator color={Colors.spotifyGreen} size="large" />
          <Animated.Text
            key={loadingLabel}
            entering={FadeInDown.duration(280)}
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: Colors.textPrimary,
              textAlign: 'center',
            }}
          >
            {loadingLabel}
          </Animated.Text>
          {connectingSubtitle && (
            <Text
              style={{
                fontSize: 13,
                color: Colors.textTertiary,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              {connectingSubtitle}
            </Text>
          )}
        </View>
      ) : (
        <>
          <Pressable
            onPress={onConnect}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: Colors.spotifyGreen,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
              Connect with Spotify
            </Text>
          </Pressable>

          {onSkip && (
            <Pressable onPress={onSkip} style={{ marginTop: 20 }} hitSlop={12}>
              <Text style={{ fontSize: 14, color: Colors.textTertiary }}>Skip for now →</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
