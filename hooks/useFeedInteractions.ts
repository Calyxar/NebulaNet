// hooks/useFeedInteractions.ts — UPDATED ✅
// ✅ FIXED: onLike now uses useToggleLike (checks is_liked state before toggling)
// ✅ FIXED: onSave now uses useToggleBookmark (checks is_saved state before toggling)
// ✅ Previously used useLikePost/useSavePost which blindly added likes without checking

import { useCallback, useRef } from "react";
import type { ViewToken } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { postKeys, useToggleBookmark, useToggleLike } from "@/hooks/usePosts";
import { db } from "@/lib/firebase";
import type { Post } from "@/lib/firestore/posts";
import firestore from "@react-native-firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";

async function trackPostView(postId: string, viewerId: string) {
  if (!postId || !viewerId) return;
  const id = `${viewerId}_${postId}`;
  await db
    .collection("post_views")
    .doc(id)
    .set(
      {
        post_id: postId,
        viewer_id: viewerId,
        created_at_ts: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export function useFeedInteractions() {
  const { user } = useAuth();
  const viewerId = user?.uid ?? "";
  const qc = useQueryClient();

  // ✅ FIXED: use proper toggle mutations from usePosts
  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();

  const viewedRef = useRef<Set<string>>(new Set());

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 350,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewerId) return;
      for (const v of viewableItems) {
        if (!v.isViewable) continue;
        const post = v.item as Post | undefined;
        if (!post?.id) continue;
        if (viewedRef.current.has(post.id)) continue;
        viewedRef.current.add(post.id);
        trackPostView(post.id, viewerId).catch(() => {});
      }
    },
    [viewerId],
  );

  // ✅ FIXED: look up current is_liked state from cache before toggling
  const onLike = useCallback(
    (postId: string) => {
      // Find the post in the infinite feed cache to get current is_liked state
      const allListData = qc.getQueriesData({ queryKey: postKeys.lists() });
      let isLiked = false;
      for (const [, data] of allListData) {
        if (!data) continue;
        const pages = (data as any)?.pages ?? [];
        for (const page of pages) {
          const post = (page?.posts ?? []).find((p: Post) => p.id === postId);
          if (post) {
            isLiked = !!post.is_liked;
            break;
          }
        }
      }
      toggleLikeMutation.mutate({ postId, isLiked });
    },
    [toggleLikeMutation, qc],
  );

  // ✅ FIXED: look up current is_saved state from cache before toggling
  const onSave = useCallback(
    (postId: string) => {
      const allListData = qc.getQueriesData({ queryKey: postKeys.lists() });
      let isSaved = false;
      for (const [, data] of allListData) {
        if (!data) continue;
        const pages = (data as any)?.pages ?? [];
        for (const page of pages) {
          const post = (page?.posts ?? []).find((p: Post) => p.id === postId);
          if (post) {
            isSaved = !!post.is_saved;
            break;
          }
        }
      }
      toggleBookmarkMutation.mutate({ postId, isSaved });
    },
    [toggleBookmarkMutation, qc],
  );

  return {
    onLike,
    onSave,
    viewabilityConfig,
    onViewableItemsChanged,
    likeMutation: toggleLikeMutation,
    saveMutation: toggleBookmarkMutation,
  };
}
