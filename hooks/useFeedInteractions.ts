// hooks/useFeedInteractions.ts
import { useCallback, useRef } from "react";
import type { ViewToken } from "react-native";

import { useLikePost } from "@/hooks/useLikes";
import { useSavePost } from "@/hooks/useSaves";
import type { Post } from "@/lib/queries/posts";
import { trackPostView } from "@/lib/supabase";

/**
 * Centralized feed interaction logic:
 * - Like toggle (optimistic)
 * - Save toggle (optimistic)
 * - View tracking (once per session, per post)
 *
 * This hook is intentionally UI-agnostic.
 * Use it from Home, Community feed, Profile feed, etc.
 */
export function useFeedInteractions() {
  const likeMutation = useLikePost();
  const saveMutation = useSavePost();

  /**
   * Track which posts were already viewed
   * (in-memory only, resets on screen unmount)
   */
  const viewedRef = useRef<Set<string>>(new Set());

  /**
   * FlatList viewability config
   * Matches social app norms (Instagram/Twitter-like)
   */
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 350,
  }).current;

  /**
   * View tracking handler
   * Call this from FlatList.onViewableItemsChanged
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const v of viewableItems) {
        if (!v.isViewable) continue;

        const post = v.item as Post | undefined;
        if (!post?.id) continue;

        // Track once per session
        if (viewedRef.current.has(post.id)) continue;

        viewedRef.current.add(post.id);
        trackPostView(post.id); // fire-and-forget
      }
    },
    [],
  );

  /**
   * Like toggle
   */
  const onLike = useCallback(
    (postId: string) => {
      likeMutation.mutate(postId);
    },
    [likeMutation],
  );

  /**
   * Save toggle
   */
  const onSave = useCallback(
    (postId: string) => {
      saveMutation.mutate(postId);
    },
    [saveMutation],
  );

  return {
    // actions
    onLike,
    onSave,

    // view tracking
    viewabilityConfig,
    onViewableItemsChanged,

    // exposed mutations (optional UI usage)
    likeMutation,
    saveMutation,
  };
}
