import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Colors } from '@/constants/colors';
import { AuthContext } from '@/contexts/auth-context';
import { FollowListRow } from '@/components/follow-list-row';
import { useFollowersList } from '@/hooks/use-profile';

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingTop: 80 }}>
      <Image source="sf:person.2" style={{ width: 48, height: 48 }} tintColor={Colors.textTertiary} />
      <Text style={{ fontSize: 15, color: Colors.textTertiary }}>{text}</Text>
    </View>
  );
}

export default function OwnFollowersScreen() {
  const { user: currentUser } = React.use(AuthContext);
  const username = currentUser?.username ?? '';

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFollowersList(username);

  const users = data?.pages.flatMap((p) => p.results.map((f) => f.follower)) ?? [];
  const renderItem = useCallback(({ item }: { item: typeof users[number] }) => <FollowListRow user={item} />, []);

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => String(u.id)}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      onEndReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Colors.accent}
        />
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.accent} />
        ) : (
          <EmptyState text="No followers yet" />
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.accent} />
        ) : null
      }
    />
  );
}
