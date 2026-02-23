// hooks/useShares.ts — FIREBASE ✅

import { postKeys } from "@/hooks/usePosts";
import { auth, db } from "@/lib/firebase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, updateDoc } from "firebase/firestore";

async function incrementShareCount(postId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Post not found");
  const current = (snap.data() as any).share_count ?? 0;
  await updateDoc(ref, { share_count: current + 1 });
}

type FeedPage = { posts: any[] };
type InfiniteFeed = { pages: FeedPage[]; pageParams: any[] };

export function useOptimisticSharePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
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
  });
}
