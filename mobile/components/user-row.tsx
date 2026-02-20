import { View, Text, Pressable } from 'react-native';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import type { User } from '@/types/api';

interface UserRowProps {
  user: User;
  isFollowing?: boolean;
  onFollowPress?: () => void;
  showFollowButton?: boolean;
}

function displayName(user: User): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function UserRow({
  user,
  isFollowing = false,
  onFollowPress,
  showFollowButton = true,
}: UserRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <AvatarImage uri={user.avatar_url} size={44} displayName={displayName(user)} />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
          {displayName(user)}
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textTertiary }} numberOfLines={1}>
          @{user.username}
        </Text>
      </View>

      {showFollowButton && (
        <Pressable
          onPress={onFollowPress}
          style={({ pressed }) => ({
            borderRadius: 100,
            paddingHorizontal: 16,
            paddingVertical: 7,
            opacity: pressed ? 0.7 : 1,
            ...(isFollowing
              ? {
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)',
                }
              : {
                  backgroundColor: Colors.accent,
                }),
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: isFollowing ? Colors.textPrimary : '#000000',
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
