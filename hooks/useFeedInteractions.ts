// hooks/useFeedInteractions.ts ✅
// ✅ FIXED: imported `Post` from "@/lib/firestore/posts" — that module
// only imports Post from hooks/useFeed for its own internal use, it
// never re-exports it. Fixed to import from the real source.
// ✅ NEW (Phase C): viewabilityConfig now requires a post to stay ≥50%
// visible for at least 1s (minimumViewTime — a built-in FlatList
// viewability option) before it counts as "viewed." onViewableItemsChanged
// fires trackPostView for each item that clears that threshold, feeding
// the dwell-time signal computeForYouRankedPool reads in posts.ts.
// Fire-and-forget — a dropped write here is one missed data point, not a
// broken feature, so it's never awaited or shown as loading state.
// Note: onRepost below is dead code — PostCard.tsx handles repost
// entirely internally via its own useToggleRepost mutation rather than
// taking a repost callback prop (confirmed earlier; both paths share the
// same underlying mutation, so nothing is out of sync, this just isn't
// called from anywhere).

import { useAuth } from "@/hooks/useAuth";
import type { Post } from "@/hooks/useFeed";
import {
  useToggleBookmark,
  useToggleLike,
  useToggleRepost,
} from "@/hooks/usePosts";
import { trackPostView } from "@/lib/firestore/affinity";
import { useRef } from "react";

export function useFeedInteractions() {
  const { user } = useAuth();
  const toggleLikeMutation = useToggleLike();
  const toggleSaveMutation = useToggleBookmark();
  const toggleRepostMutation = useToggleRepost(); // kept for onRepost below

  const onLike = (postId: string, isLiked: boolean = false) => {
    toggleLikeMutation.mutate({ postId, isLiked });
  };

  const onSave = (postId: string, isSaved: boolean = false) => {
    toggleSaveMutation.mutate({ postId, isSaved });
  };

  // Dead code — PostCard.tsx no longer takes a repost callback prop, it
  // manages repost internally. Left in place rather than removed since
  // it's harmless and some future caller might still want a plain
  // repost-by-id function without mounting a full PostCard.
  const onRepost = (postId: string, isReposted: boolean = false) => {
    toggleRepostMutation.mutate({ postId, isReposted });
  };

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    // ✅ NEW (Phase C): without this, a fast scroll-past counts as a
    // "view" the same as someone actually reading the post — the whole
    // point of a dwell-time signal is distinguishing those two cases.
    minimumViewTime: 1000,
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: Post }[] }) => {
      if (!user?.uid) return;
      viewableItems.forEach((viewable) => {
        const authorId = (viewable.item as any)?.user_id;
        // Don't track views of your own posts as a signal — that's not
        // a useful "does this person like reading X" data point.
        if (authorId && authorId !== user.uid) {
          trackPostView(user.uid, authorId).catch(() => {});
        }
      });
    },
  ).current;

  return {
    onLike,
    onSave,
    onRepost,
    viewabilityConfig,
    onViewableItemsChanged,
  };
}
