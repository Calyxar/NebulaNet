// hooks/useShares.ts — FIREBASE ✅

import { postKeys } from "@/hooks/usePosts";
import { sharePost } from "@/lib/firestore/interactions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type FeedPage = { posts: any[] };
type InfiniteFeed = { pages: FeedPage[]; pageParams: any[] };

export function useOptimisticSharePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await sharePost(postId);
      return postId;
    },
    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const previous = qc.getQueriesData({ queryKey: postKeys.lists() });

      qc.setQueriesData(
        { queryKey: postKeys.lists() },
        (old: InfiniteFeed | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              posts: (p.posts ?? []).map((post: any) => {
                if (post?.id !== postId) return post;
                return {
                  ...post,
                  share_count: Number(post.share_count ?? 0) + 1,
                };
              }),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_err, _postId, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (_postId) => {
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
