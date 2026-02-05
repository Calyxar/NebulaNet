// hooks/useShares.ts
import { postKeys } from "@/hooks/usePosts";
import { incrementShareCount } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type FeedPage = { posts: any[] };
type InfiniteFeed = { pages: FeedPage[]; pageParams: any[] };

export function useOptimisticSharePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // backend increments share_count (your supabase.ts already does update)
      await incrementShareCount(postId);
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
                const current = Number(post.share_count ?? 0);
                return { ...post, share_count: current + 1 };
              }),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (_err, _postId, ctx) => {
      ctx?.previous.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
  });
}
