// hooks/useLikes.ts
import { postKeys } from "@/hooks/usePosts";
import type { PaginatedPosts, Post } from "@/lib/queries/posts";
import { supabase } from "@/lib/supabase";
import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function updatePostInAllPages(
  old: InfiniteData<PaginatedPosts> | undefined,
  postId: string,
  updater: (p: Post) => Post,
) {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => (p.id === postId ? updater(p) : p)),
    })),
  };
}

export function useLikePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // check existing like
      const { data: existing, error: checkError } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing?.id) {
        // unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { postId, isLiked: false };
      }

      // like (include user_id if your table requires it)
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: user.id, post_id: postId });

      if (error) throw error;

      return { postId, isLiked: true };
    },

    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });

      const previous = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });

      // optimistic toggle
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updatePostInAllPages(old, postId, (p) => {
            const nextLiked = !Boolean(p.is_liked);
            const nextCount = Math.max(
              0,
              (p.like_count ?? 0) + (nextLiked ? 1 : -1),
            );

            return {
              ...p,
              is_liked: nextLiked,
              like_count: nextCount,
            };
          }),
      );

      return { previous };
    },

    onError: (_err, _postId, ctx) => {
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },

    onSuccess: ({ postId, isLiked }) => {
      // reconcile (only adjust count if our optimistic state differs)
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updatePostInAllPages(old, postId, (p) => {
            if (Boolean(p.is_liked) === isLiked) return p;

            const nextCount = Math.max(
              0,
              (p.like_count ?? 0) + (isLiked ? 1 : -1),
            );

            return { ...p, is_liked: isLiked, like_count: nextCount };
          }),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
