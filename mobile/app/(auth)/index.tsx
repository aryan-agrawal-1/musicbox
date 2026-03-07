import { use } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';

const TILE_COLORS = [
  '#C53030', '#2B6CB0', '#276749',
  '#B7791F', '#553C9A', '#285E61',
  '#C05621', '#D53F8C', '#2C7A7B',
  '#744210', '#2A4365', '#4A5568',
];

export default function LandingScreen() {
  const router = useRouter();
  const auth = use(AuthContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tileW = width / 3;
  const tileH = height / 4;

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const result = await auth.appleSignIn(
        credential.identityToken ?? '',
        credential.email ?? '',
        {
          givenName: credential.fullName?.givenName ?? '',
          familyName: credential.fullName?.familyName ?? '',
        }
      );

      if (!result.isExistingUser) {
        // New user — navigate to register; the flow detects pendingAppleAuth automatically
        router.push('/(auth)/register');
      }
      // Existing user: auth context set the user, root layout re-renders to tabs
    } catch (err: unknown) {
      // ERR_REQUEST_CANCELED = user dismissed the Apple sheet — ignore silently
      if ((err as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        console.error('[AppleSignIn]', err);
      }
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Background tile grid */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15 }}>
        {TILE_COLORS.map((color, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (i % 3) * tileW,
              top: Math.floor(i / 3) * tileH,
              width: tileW,
              height: tileH,
              backgroundColor: color,
            }}
          />
        ))}
      </View>

      {/* Blur overlay */}
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        intensity={80}
        tint="dark"
      />

      {/* Centered content */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: '700',
            color: Colors.textPrimary,
            letterSpacing: -1,
          }}
        >
          Muze
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, letterSpacing: -0.2 }}>
          Your music, remembered.
        </Text>
      </View>

      {/* Bottom CTAs */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 32,
          left: 24,
          right: 24,
          gap: 12,
        }}
      >
        {process.env.EXPO_OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={16}
            style={{ height: 56 }}
            onPress={handleAppleSignIn}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/(auth)/login')}
          style={{
            height: 56,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000', letterSpacing: -0.3 }}>
            Sign in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/(auth)/register')}
          style={{
            height: 56,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: 'rgba(255, 255, 255, 0.09)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3 }}>
            Create account
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 12,
            color: Colors.textTertiary,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          By continuing you agree to our Terms &amp; Privacy Policy
        </Text>
      </View>
    </View>
  );
}
