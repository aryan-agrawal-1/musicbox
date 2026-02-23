import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/colors';
import { StarRating, getRatingLabel } from '@/components/star-rating';
import { useAlbum, useUserAlbumRating } from '@/hooks/use-album';
import { useTrack, useUserSongRating } from '@/hooks/use-track';
import { apiFetch, ApiError } from '@/lib/api';
import type {
  AlbumReview,
  AlbumRating,
  PaginatedResponse,
  SongReview,
  SongRating,
} from '@/types/api';

type RateParams = {
  albumId?: string;
  trackId?: string;
  type?: 'album' | 'track';
};

export default function RateSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<RateParams>();

  const albumId = typeof params.albumId === 'string' ? params.albumId : undefined;
  const trackId = typeof params.trackId === 'string' ? params.trackId : undefined;
  const explicitType =
    params.type === 'album' || params.type === 'track' ? params.type : undefined;

  const mode: 'album' | 'track' | 'unknown' =
    explicitType ?? (albumId ? 'album' : trackId ? 'track' : 'unknown');

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const hasInitialised = useRef(false);

  const {
    data: album,
    isLoading: isAlbumLoading,
  } = useAlbum(mode === 'album' && albumId ? albumId : '');
  const {
    data: track,
    isLoading: isTrackLoading,
  } = useTrack(mode === 'track' && trackId ? trackId : '');

  const { data: existingAlbumRating } = useUserAlbumRating(
    mode === 'album' && albumId ? albumId : ''
  );
  const { data: existingSongRating } = useUserSongRating(
    mode === 'track' && trackId ? trackId : ''
  );

  const { data: existingAlbumReview } = useQuery({
    queryKey: ['album', albumId, 'my-review'],
    queryFn: async () => {
      const id = albumId;
      if (!id) return null;
      try {
        const res = await apiFetch<PaginatedResponse<AlbumReview>>(
          `/api/v1/reviews/albums/reviews/?album=${id}&user=me&limit=1`
        );
        return res.results[0] ?? null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: mode === 'album' && !!albumId,
    staleTime: 0,
  });

  const { data: existingSongReview } = useQuery({
    queryKey: ['track', trackId, 'my-review'],
    queryFn: async () => {
      const id = trackId;
      if (!id) return null;
      try {
        const res = await apiFetch<PaginatedResponse<SongReview>>(
          `/api/v1/reviews/songs/reviews/?song=${id}&user=me&limit=1`
        );
        return res.results[0] ?? null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: mode === 'track' && !!trackId,
    staleTime: 0,
  });

  const existingRating: AlbumRating | SongRating | null =
    mode === 'album' ? existingAlbumRating ?? null : existingSongRating ?? null;
  const existingReview: AlbumReview | SongReview | null =
    mode === 'album' ? existingAlbumReview ?? null : existingSongReview ?? null;

  useEffect(() => {
    if (hasInitialised.current) return;

    const raw = existingRating?.rating;
    const baseRating =
      typeof raw === 'number' ? raw : raw != null ? Number(raw) : 0;

    const baseReview = existingReview?.content ?? '';

    if (baseRating > 0 || baseReview.length > 0) {
      setRating(baseRating);
      setReviewText(baseReview);
      hasInitialised.current = true;
    }
  }, [existingRating, existingReview]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'unknown') {
        throw new Error('Missing album or track id');
      }
      if (rating === 0) {
        throw new Error('Please choose a rating');
      }
      if (mode === 'album' && !album?.id) {
        throw new Error('Album not loaded yet');
      }
      if (mode === 'track' && !track?.id) {
        throw new Error('Track not loaded yet');
      }

      if (process.env.EXPO_OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const trimmedReview = reviewText.trim();

      if (mode === 'album') {
        const spotifyId = albumId!;
        const albumPk = album!.id;
        const ratingRes = existingRating
          ? await apiFetch<AlbumRating>(
              `/api/v1/reviews/albums/ratings/${existingRating.id}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({ rating }),
              }
            )
          : await apiFetch<AlbumRating>('/api/v1/reviews/albums/ratings/', {
              method: 'POST',
              body: JSON.stringify({ album: albumPk, rating }),
            });

        if (trimmedReview.length > 0) {
          if (existingReview) {
            await apiFetch<AlbumReview>(
              `/api/v1/reviews/albums/reviews/${existingReview.id}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({ content: trimmedReview }),
              }
            );
          } else {
            await apiFetch<AlbumReview>('/api/v1/reviews/albums/reviews/', {
              method: 'POST',
              body: JSON.stringify({
                album: albumPk,
                rating: ratingRes.id,
                content: trimmedReview,
              }),
            });
          }
        } else if (existingReview) {
          await apiFetch(`/api/v1/reviews/albums/reviews/${existingReview.id}/`, {
            method: 'DELETE',
          });
        }

        queryClient.invalidateQueries({ queryKey: ['album', spotifyId] });
      } else {
        const spotifyId = trackId!;
        const songPk = track!.id;
        const ratingRes = existingRating
          ? await apiFetch<SongRating>(
              `/api/v1/reviews/songs/ratings/${existingRating.id}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({ rating }),
              }
            )
          : await apiFetch<SongRating>('/api/v1/reviews/songs/ratings/', {
              method: 'POST',
              body: JSON.stringify({ song: songPk, rating }),
            });

        if (trimmedReview.length > 0) {
          if (existingReview) {
            await apiFetch<SongReview>(
              `/api/v1/reviews/songs/reviews/${existingReview.id}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({ content: trimmedReview }),
              }
            );
          } else {
            await apiFetch<SongReview>('/api/v1/reviews/songs/reviews/', {
              method: 'POST',
              body: JSON.stringify({
                song: songPk,
                rating: ratingRes.id,
                content: trimmedReview,
              }),
            });
          }
        } else if (existingReview) {
          await apiFetch(`/api/v1/reviews/songs/reviews/${existingReview.id}/`, {
            method: 'DELETE',
          });
        }

        queryClient.invalidateQueries({ queryKey: ['track', spotifyId] });
      }
    },
    onSuccess: () => {
      router.back();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!existingRating || mode === 'unknown') return;

      if (mode === 'album') {
        await apiFetch(`/api/v1/reviews/albums/ratings/${existingRating.id}/`, {
          method: 'DELETE',
        });
        queryClient.invalidateQueries({ queryKey: ['album', albumId!] });
      } else {
        await apiFetch(`/api/v1/reviews/songs/ratings/${existingRating.id}/`, {
          method: 'DELETE',
        });
        queryClient.invalidateQueries({ queryKey: ['track', trackId!] });
      }
    },
    onSuccess: () => {
      router.back();
    },
  });

  const isContextLoading =
    mode === 'album' ? isAlbumLoading : mode === 'track' ? isTrackLoading : false;

  const ratingLabel = getRatingLabel(rating);

  if (mode === 'unknown') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
          Something went wrong opening this sheet.
        </Text>
      </View>
    );
  }

  const contextImage =
    mode === 'album'
      ? album?.image_url
      : track?.album_image;
  const contextTitle =
    mode === 'album'
      ? album?.name ?? ''
      : track?.name ?? '';
  const contextSubtitle =
    mode === 'album'
      ? album?.artists.map(a => a.name).join(', ') ?? ''
      : track?.artists.map(a => a.name).join(', ') ?? '';
  const contextMeta =
    mode === 'album'
      ? album?.release_date?.slice(0, 4) ?? ''
      : track?.album_name ?? '';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: insets.bottom + 32,
        gap: 28,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: Colors.surfaceHigh,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {contextImage && !isContextLoading ? (
            <Image
              source={{ uri: contextImage }}
              style={{ width: 80, height: 80 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 28, color: Colors.textTertiary }}>♪</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: Colors.textPrimary,
            }}
            numberOfLines={2}
            selectable
          >
            {contextTitle}
          </Text>
          <Text
            style={{ fontSize: 14, color: Colors.textSecondary }}
            numberOfLines={1}
            selectable
          >
            {contextSubtitle}
          </Text>
          <Text
            style={{ fontSize: 13, color: Colors.textTertiary }}
            numberOfLines={1}
            selectable
          >
            {contextMeta}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 12 }}>
        <StarRating value={rating} onChange={setRating} size={38} />
        <Text
          style={{
            fontSize: 14,
            color: rating === 0 ? Colors.textTertiary : Colors.accent,
            fontWeight: '500',
          }}
        >
          {rating > 0 ? `${rating.toFixed(1)} · ${ratingLabel}` : ratingLabel}
        </Text>
      </View>

      <View
        style={{
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: Colors.surfaceElevated,
          padding: 14,
          minHeight: 96,
          gap: 6,
        }}
      >
        <TextInput
          style={{
            fontSize: 15,
            color: Colors.textPrimary,
            flex: 1,
            minHeight: 68,
            backgroundColor: 'transparent',
          }}
          placeholder="What did you think? (optional)"
          placeholderTextColor={Colors.textTertiary}
          multiline
          textAlignVertical="top"
          value={reviewText}
          onChangeText={setReviewText}
        />
        {reviewText.length > 400 && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textTertiary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {reviewText.length}/500
            </Text>
          </View>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={
            rating === 0 ||
            saveMutation.isPending ||
            (mode === 'album' && !album?.id) ||
            (mode === 'track' && !track?.id)
          }
          style={({ pressed }) => ({
            height: 52,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: Colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity:
              rating === 0 || saveMutation.isPending ? 0.35 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>
            Save rating
          </Text>
        </Pressable>

        {existingRating && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Remove rating',
                'This will remove your rating for this item.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => removeMutation.mutate(),
                  },
                ]
              );
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, color: Colors.textTertiary }}>
              Remove rating
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            alignItems: 'center',
            paddingVertical: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 15, color: Colors.textTertiary }}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

