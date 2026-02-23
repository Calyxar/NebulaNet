// hooks/useFeedInteractions.ts — FIREBASE ✅

import { useCallback, useRef } from "react";
import type { ViewToken } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import type { Post } from "@/lib/firestore/posts";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { useLikePost } from "@/hooks/useLikes";
import { useSavePost } from "@/hooks/useSaves";

// Store views as deterministic doc id so it's idempotent:
// post_views/{viewerId_postId}
async function trackPostView(postId: string, viewerId: string) {
  if (!postId || !viewerId) return;

  const id = `${viewerId}_${postId}`;
  await setDoc(
    doc(db, "post_views", id),
    { post_id: postId, viewer_id: viewerId, created_at_ts: serverTimestamp() },
    { merge: true },
  );
}

export function useFeedInteractions() {
  const { user } = useAuth();
  const viewerId = user?.uid ?? "";

  const likeMutation = useLikePost();
  const saveMutation = useSavePost();

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

  const onLike = useCallback(
    (postId: string) => likeMutation.mutate(postId),
    [likeMutation],
  );

  const onSave = useCallback(
    (postId: string) => saveMutation.mutate(postId),
    [saveMutation],
  );

  return {
    onLike,
    onSave,
    viewabilityConfig,
    onViewableItemsChanged,
    likeMutation,
    saveMutation,
  };
}
