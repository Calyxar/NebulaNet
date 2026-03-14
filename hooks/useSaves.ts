// hooks/useSaves.ts — FIXED ✅
// Fix: optimistically update list cache so feed card reflects state immediately

import { postKeys } from "@/hooks/usePosts";
import { toggleSavePost } from "@/lib/firestore/saves";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type FeedPage = { posts: any[] };
type InfiniteFeed = { pages: FeedPage[]; pageParams: any[] };

export function useSavePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const post = qc.getQueryData<any>(postKeys.detail(postId));
      const isSaved = post?.is_saved ?? false;
      await toggleSavePost(postId, isSaved);
      return { postId, next: !isSaved };
    },

    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });

      const previousDetail = qc.getQueryData(postKeys.detail(postId));
      const previousLists = qc.getQueriesData({ queryKey: postKeys.lists() });

      const detailPost = qc.getQueryData<any>(postKeys.detail(postId));
      let currentIsSaved = detailPost?.is_saved ?? false;

      if (!detailPost) {
        const lists = qc.getQueriesData<InfiniteFeed>({
          queryKey: postKeys.lists(),
        });
        for (const [, data] of lists) {
          if (!data) continue;
          for (const page of data.pages) {
            const found = page.posts?.find((p: any) => p?.id === postId);
            if (found) {
              currentIsSaved = !!found.is_saved;
              break;
            }
          }
        }
      }

      const next = !currentIsSaved;

      // ✅ update detail cache
      qc.setQueryData(postKeys.detail(postId), (old: any) =>
        old ? { ...old, is_saved: next } : old,
      );

      // ✅ update list/feed cache
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
                return { ...post, is_saved: next };
              }),
            })),
          };
        },
      );

      return { previousDetail, previousLists, next, postId };
    },

    onError: (_err, _postId, ctx) => {
      if (!ctx) return;
      qc.setQueryData(postKeys.detail(ctx.postId), ctx.previousDetail);
      ctx.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: (_data, _err, postId) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) });
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
