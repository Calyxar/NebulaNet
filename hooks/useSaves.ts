// hooks/useSaves.ts
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

export function useSavePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // check existing save
      const { data: existing, error: checkError } = await supabase
        .from("saves")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (checkError) throw checkError;

      // toggle server-side
      if (existing?.id) {
        const { error } = await supabase
          .from("saves")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { postId, isSaved: false };
      }

      const { error } = await supabase.from("saves").insert({
        user_id: user.id,
        post_id: postId,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      return { postId, isSaved: true };
    },

    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });

      const previous = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });

      // optimistic toggle
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updatePostInAllPages(old, postId, (p) => ({
            ...p,
            is_saved: !p.is_saved,
          })),
      );

      return { previous };
    },

    onError: (_err, _postId, ctx) => {
      // rollback
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },

    onSuccess: ({ postId, isSaved }) => {
      // reconcile (in case optimistic differs)
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updatePostInAllPages(old, postId, (p) => ({
            ...p,
            is_saved: isSaved,
          })),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
