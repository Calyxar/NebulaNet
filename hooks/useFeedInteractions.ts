// hooks/useFeedInteractions.ts
import { useCallback, useRef } from "react";
import type { ViewToken } from "react-native";

import { useLikePost } from "@/hooks/useLikes";
import { useSavePost } from "@/hooks/useSaves";
import type { Post } from "@/lib/queries/posts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

// View tracking helper (fire-and-forget)
async function trackPostView(postId: string, viewerId: string) {
  if (!postId || !viewerId) return;

  // Assumes a table like: post_views(post_id uuid, viewer_id uuid, created_at timestamptz default now())
  // Recommended: unique(post_id, viewer_id) so this is idempotent.
  await supabase
    .from("post_views")
    .upsert(
      { post_id: postId, viewer_id: viewerId },
      { onConflict: "post_id,viewer_id" },
    );
}

/**
 * Centralized feed interaction logic:
 * - Like toggle (optimistic)
 * - Save toggle (optimistic)
 * - View tracking (once per session, per post)
 */
export function useFeedInteractions() {
  const { user } = useAuth();

  const likeMutation = useLikePost();
  const saveMutation = useSavePost();

  // Track which posts were already viewed (in-memory only)
  const viewedRef = useRef<Set<string>>(new Set());

  // FlatList viewability config
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 350,
  }).current;

  // View tracking handler
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const viewerId = user?.id;
      if (!viewerId) return;

      for (const v of viewableItems) {
        if (!v.isViewable) continue;

        const post = v.item as Post | undefined;
        if (!post?.id) continue;

        if (viewedRef.current.has(post.id)) continue;

        viewedRef.current.add(post.id);

        // fire-and-forget
        trackPostView(post.id, viewerId).catch(() => {});
      }
    },
    [user?.id],
  );

  // Like toggle
  const onLike = useCallback(
    (postId: string) => {
      likeMutation.mutate(postId);
    },
    [likeMutation],
  );

  // Save toggle
  const onSave = useCallback(
    (postId: string) => {
      saveMutation.mutate(postId);
    },
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
