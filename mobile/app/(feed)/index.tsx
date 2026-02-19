import { use } from 'react';
import { View, Pressable, Text } from 'react-native';
import { AuthContext } from '@/contexts/auth-context';
import { Colors } from '@/constants/colors';

// P5.1 — Feed screen (implemented in Phase 5)
export default function FeedScreen() {
  const { logout } = use(AuthContext);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Pressable
        onPress={logout}
        style={({ pressed }) => ({
          paddingHorizontal: 24,
          paddingVertical: 12,
          backgroundColor: pressed ? Colors.accent + '99' : Colors.accent,
          borderRadius: 8,
        })}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
      </Pressable>
    </View>
  );
}
