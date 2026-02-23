// hooks/useLikes.ts — FIREBASE ✅

import { postKeys } from "@/hooks/usePosts";
import { toggleLikePost } from "@/lib/firestore/likes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLikePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // read current cached state to decide toggle direction
      const post = qc.getQueryData<any>(postKeys.detail(postId));
      const isLiked = !!post?.is_liked;
      await toggleLikePost(postId, isLiked);
      return { postId, next: !isLiked };
    },
    onSuccess: ({ postId, next }) => {
      // update detail cache
      qc.setQueryData(postKeys.detail(postId), (old: any) =>
        old
          ? {
              ...old,
              is_liked: next,
              like_count: Math.max(0, (old.like_count ?? 0) + (next ? 1 : -1)),
            }
          : old,
      );

      // refresh lists
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
