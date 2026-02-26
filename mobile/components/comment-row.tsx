import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import type { AlbumReviewComment } from '@/types/api';

interface CommentRowProps {
  comment: AlbumReviewComment;
  index?: number;
  onReply?: (comment: AlbumReviewComment) => void;
  onLike: (id: number, isLiked: boolean) => void;
  onUserPress?: (username: string) => void;
  isReply?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return `${Math.floor(d / 30)}mo`;
}

function displayName(user: AlbumReviewComment['user']): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function CommentRow({ comment, index = 0, onReply, onLike, onUserPress, isReply = false }: CommentRowProps) {
  const router = useRouter();
  const handleUserPress = () => onUserPress
    ? onUserPress(comment.user.username)
    : router.push(`/user/${comment.user.username}`);
  const scale = useSharedValue(1);
  const avatarSize = isReply ? 28 : 36;
  const delay = Math.min(index, 8) * 40;

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handleLike() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scale.value = withSequence(
      withSpring(1.4, { damping: 15, stiffness: 600 }),
      withSpring(1.0, { damping: 20, stiffness: 400 }),
    );
    onLike(comment.id, comment.is_liked);
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        ...(isReply ? { marginLeft: 46 } : {}),
      }}
    >
      {/* Avatar — tappable */}
      <Pressable
        onPress={handleUserPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start' })}
      >
        <AvatarImage uri={comment.user.avatar_url} size={avatarSize} displayName={displayName(comment.user)} />
      </Pressable>

      {/* Content column */}
      <View style={{ flex: 1, gap: 3 }}>
        {/* Username + timestamp */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable onPress={() => router.push(`/user/${comment.user.username}`)}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.accent }} numberOfLines={1}>
              @{comment.user.username}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: Colors.textTertiary }}>
            · {formatRelativeTime(comment.created_at)}
          </Text>
        </View>

        {/* Comment text */}
        <Text
          selectable
          style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}
        >
          {comment.content}
        </Text>

        {/* Reply action (top-level only) */}
        {!isReply && onReply && (
          <Pressable onPress={() => onReply(comment)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 12, color: Colors.textTertiary, marginTop: 2 }}>Reply</Text>
          </Pressable>
        )}
      </View>

      {/* Like button — vertically centered, right side */}
      <Pressable
        onPress={handleLike}
        hitSlop={10}
        style={{ alignItems: 'center', gap: 3, minWidth: 28 }}
      >
        <Animated.View style={heartStyle}>
          <Image
            source={comment.is_liked ? 'sf:heart.fill' : 'sf:heart'}
            style={{ width: 18, height: 18 }}
            tintColor={comment.is_liked ? '#FF3B30' : Colors.textTertiary}
          />
        </Animated.View>
        {comment.likes_count > 0 && (
          <Text style={{ fontSize: 11, color: Colors.textTertiary }}>
            {comment.likes_count}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
