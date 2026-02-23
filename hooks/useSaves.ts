// hooks/useSaves.ts — FIREBASE ✅

import { postKeys } from "@/hooks/usePosts";
import { toggleSavePost } from "@/lib/firestore/saves";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSavePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const post = qc.getQueryData<any>(postKeys.detail(postId));
      const isSaved = !!post?.is_saved;
      await toggleSavePost(postId, isSaved);
      return { postId, next: !isSaved };
    },
    onSuccess: ({ postId, next }) => {
      qc.setQueryData(postKeys.detail(postId), (old: any) =>
        old ? { ...old, is_saved: next } : old,
      );
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
