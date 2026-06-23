// hooks/useLikes.ts — FIXED ✅
// Fix: optimistically update list cache so feed card reflects state immediately
// Previously only updated detail cache → feed card stayed stale until refetch
// ✅ NEW: records author affinity (for the For You ranking algorithm) when
// a post transitions from not-liked to liked. Does NOT record on unlike —
// affinity only ever builds up, see lib/firestore/affinity.ts for why.

import { postKeys } from "@/hooks/usePosts";
import { recordAffinity } from "@/lib/firestore/affinity";
import { toggleLikePost } from "@/lib/firestore/likes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type FeedPage = { posts: any[] };
type InfiniteFeed = { pages: FeedPage[]; pageParams: any[] };

export function useLikePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const post = qc.getQueryData<any>(postKeys.detail(postId));
      // also check list cache if detail not loaded
      const isLiked = post?.is_liked ?? false;
      await toggleLikePost(postId, isLiked);

      // ✅ NEW: record affinity only when going from not-liked -> liked.
      // We need the post's author id — pull it from whichever cache
      // (detail or list) already has it, since toggleLikePost itself
      // doesn't return the post data and we don't want a second read
      // just for this. If we can't find it cheaply, skip silently —
      // affinity tracking is a nice-to-have signal, never worth an
      // extra round trip on the critical like-tap path.
      if (!isLiked) {
        let authorId: string | undefined = post?.user_id;
        if (!authorId) {
          const lists = qc.getQueriesData<InfiniteFeed>({
            queryKey: postKeys.lists(),
          });
          for (const [, data] of lists) {
            if (authorId) break;
            if (!data) continue;
            for (const page of data.pages) {
              const found = page.posts?.find((p: any) => p?.id === postId);
              if (found?.user_id) {
                authorId = found.user_id;
                break;
              }
            }
          }
        }
        if (authorId) {
          recordAffinity(authorId, "like").catch(() => {});
        }
      }

      return { postId, next: !isLiked };
    },

    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });

      // snapshot for rollback
      const previousDetail = qc.getQueryData(postKeys.detail(postId));
      const previousLists = qc.getQueriesData({ queryKey: postKeys.lists() });

      // figure out current state from detail or list cache
      const detailPost = qc.getQueryData<any>(postKeys.detail(postId));
      let currentIsLiked = detailPost?.is_liked ?? false;

      if (!detailPost) {
        // scan list cache to find current state
        const lists = qc.getQueriesData<InfiniteFeed>({
          queryKey: postKeys.lists(),
        });
        for (const [, data] of lists) {
          if (!data) continue;
          for (const page of data.pages) {
            const found = page.posts?.find((p: any) => p?.id === postId);
            if (found) {
              currentIsLiked = !!found.is_liked;
              break;
            }
          }
        }
      }

      const next = !currentIsLiked;
      const delta = next ? 1 : -1;

      // ✅ optimistically update detail cache
      qc.setQueryData(postKeys.detail(postId), (old: any) =>
        old
          ? {
              ...old,
              is_liked: next,
              like_count: Math.max(0, (old.like_count ?? 0) + delta),
            }
          : old,
      );

      // ✅ optimistically update list/feed cache
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
                  is_liked: next,
                  like_count: Math.max(0, (post.like_count ?? 0) + delta),
                };
              }),
            })),
          };
        },
      );

      return { previousDetail, previousLists, next, postId };
    },

    onError: (_err, _postId, ctx) => {
      if (!ctx) return;
      // rollback
      qc.setQueryData(postKeys.detail(ctx.postId), ctx.previousDetail);
      ctx.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: (_data, _err, postId) => {
      // reconcile with server after mutation settles
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) });
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
