import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthContext } from '@/contexts/auth-context';
import { UserRow } from '@/components/user-row';
import { useIsFollowing, useFollowMutation, useUnfollowMutation } from '@/hooks/use-profile';
import type { User } from '@/types/api';

export function FollowListRow({ user }: { user: User }) {
  const router = useRouter();
  const { user: currentUser } = React.use(AuthContext);
  const isOwnUser = currentUser?.id === user.id;

  const { data: followData } = useIsFollowing(isOwnUser ? '' : user.username);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  const isFollowing = followData?.is_following ?? false;

  function handleFollowPress() {
    if (isFollowing) {
      unfollowMutation.mutate({ userId: user.id, username: user.username });
    } else {
      followMutation.mutate({ userId: user.id, username: user.username });
    }
  }

  return (
    <Pressable
      onPress={() => router.push(`/user/${user.username}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <UserRow
        user={user}
        isFollowing={isFollowing}
        onFollowPress={handleFollowPress}
        showFollowButton={!isOwnUser}
      />
    </Pressable>
  );
}
