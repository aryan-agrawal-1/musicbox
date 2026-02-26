import { useRef, useState, use } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { AvatarImage } from '@/components/avatar-image';
import { SkeletonCard } from '@/components/skeleton-card';
import { CommentRow } from '@/components/comment-row';
import { AuthContext } from '@/contexts/auth-context';
import {
  useReviewComments,
  useCommentReplies,
  useToggleCommentLike,
  usePostComment,
} from '@/hooks/use-review-detail';
import type { AlbumReviewComment } from '@/types/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function displayName(user: { first_name: string; last_name: string; username: string }): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

// ─── InlineReplies ────────────────────────────────────────────────────────────

function InlineReplies({
  comment,
  type,
  reviewId,
  onUserPress,
}: {
  comment: AlbumReviewComment;
  type: 'album' | 'song';
  reviewId: string;
  onUserPress: (username: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggleCommentLike = useToggleCommentLike(reviewId, type);
  const { data, isLoading } = useCommentReplies(comment.id, type, expanded);

  if (comment.replies_count === 0) return null;

  return (
    <View style={{ marginLeft: 46 }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 16 }}
      >
        <View style={{ height: 1, width: 28, backgroundColor: Colors.separator }} />
        <Text style={{ fontSize: 13, color: Colors.textTertiary }}>
          {expanded
            ? 'Hide replies'
            : `View ${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`}
        </Text>
        <View style={{ height: 1, width: 28, backgroundColor: Colors.separator }} />
      </Pressable>

      {expanded && (
        <>
          {isLoading && (
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              <SkeletonCard height={48} borderRadius={10} />
              <SkeletonCard height={48} borderRadius={10} />
            </View>
          )}
          {data?.results.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              isReply
              onLike={(id, isLiked) => toggleCommentLike.mutate({ commentId: id, liked: isLiked })}
              onUserPress={onUserPress}
            />
          ))}
        </>
      )}
    </View>
  );
}

// ─── Comments Sheet ───────────────────────────────────────────────────────────

export default function CommentsSheet() {
  const { reviewId, type = 'album' } = useLocalSearchParams<{
    reviewId: string;
    type: 'album' | 'song';
  }>();
  const { user: currentUser } = use(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleUserPress(username: string) {
    router.dismiss();
    setTimeout(() => router.push(`/user/${username}`), 50);
  }

  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<AlbumReviewComment | null>(null);

  const reviewType = (type as 'album' | 'song') ?? 'album';

  const {
    data: commentsData,
    isLoading: commentsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useReviewComments(reviewId, reviewType);

  const allComments = commentsData?.pages.flatMap((p) => p.results) ?? [];
  const commentsTotal = commentsData?.pages[0]?.count ?? 0;

  const toggleCommentLike = useToggleCommentLike(reviewId, reviewType);
  const postComment = usePostComment(reviewId, reviewType);

  function handleSend() {
    const text = draft.trim();
    if (!text || postComment.isPending) return;
    setDraft('');
    setReplyTarget(null);
    Keyboard.dismiss();
    postComment.mutate({ content: text, parentId: replyTarget?.id });
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
      {/* ── Header ── */}
      <View
          collapsable={false}
          style={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.separator,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.textPrimary }}>
            {'Comments'}
            {commentsTotal > 0 && (
              <Text style={{ fontWeight: '400', color: Colors.textTertiary }}>
                {' '}
                {commentsTotal}
              </Text>
            )}
          </Text>
        </View>

        {/* ── Comment list ── */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          {commentsLoading ? (
            <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 8 }}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} height={64} borderRadius={12} />
              ))}
            </View>
          ) : allComments.length === 0 ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={{ alignItems: 'center', gap: 10, paddingVertical: 48 }}
            >
              <Image
                source="sf:bubble.left"
                style={{ width: 34, height: 34 }}
                tintColor={Colors.textTertiary}
              />
              <Text style={{ fontSize: 15, color: Colors.textTertiary, fontWeight: '500' }}>
                No comments yet
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textTertiary }}>
                Be the first to comment
              </Text>
            </Animated.View>
          ) : (
            <View style={{ gap: 2 }}>
              {allComments.map((comment, index) => (
                <View key={comment.id}>
                  <CommentRow
                    comment={comment}
                    index={index}
                    onReply={(c) => {
                      setReplyTarget(c);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    onLike={(id, isLiked) =>
                      toggleCommentLike.mutate({ commentId: id, liked: isLiked })
                    }
                    onUserPress={handleUserPress}
                  />
                  <InlineReplies comment={comment} type={reviewType} reviewId={reviewId} onUserPress={handleUserPress} />
                </View>
              ))}

              {hasNextPage && (
                <Pressable
                  onPress={() => fetchNextPage()}
                  style={{ alignItems: 'center', paddingVertical: 16 }}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Text style={{ fontSize: 13, color: Colors.accent }}>Load more</Text>
                  )}
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Reply strip ── */}
        {replyTarget && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 7,
              backgroundColor: Colors.accentDim,
            }}
          >
            <Text style={{ fontSize: 12, color: Colors.accent }}>
              Replying to @{replyTarget.user.username}
            </Text>
            <Pressable onPress={() => setReplyTarget(null)} hitSlop={10}>
              <Text style={{ fontSize: 12, color: Colors.textTertiary }}>✕</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Input bar ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
            borderTopWidth: 1,
            borderTopColor: Colors.separator,
          }}
        >
          <AvatarImage
            uri={currentUser?.avatar_url ?? null}
            size={32}
            displayName={displayName(currentUser ?? { first_name: '', last_name: '', username: '?' })}
          />
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={
              replyTarget ? `Replying to @${replyTarget.user.username}…` : 'Add a comment…'
            }
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={500}
            style={{
              flex: 1,
              backgroundColor: Colors.surfaceElevated,
              borderRadius: 20,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 8,
              color: Colors.textPrimary,
              fontSize: 15,
              maxHeight: 100,
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={draft.trim().length === 0 || postComment.isPending}
            style={{ opacity: draft.trim().length > 0 ? 1 : 0.4 }}
          >
            {postComment.isPending ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Image
                source="sf:arrow.up.circle.fill"
                style={{ width: 28, height: 28 }}
                tintColor={draft.trim().length > 0 ? Colors.accent : Colors.textTertiary}
              />
            )}
          </Pressable>
        </View>
    </KeyboardAvoidingView>
  );
}
