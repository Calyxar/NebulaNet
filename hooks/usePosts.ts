// hooks/usePosts.ts — React Native Firebase ✅
// ✅ FIXED (earlier): user_preferences query uses doc.exists() (called as
// a function) — confirmed correct for this project's Firestore typings.
// ✅ FIXED (earlier): useToggleRepost's onSettled no longer broadly
// invalidates postKeys.lists() — that match also caught the For You
// feed's ["...postKeys.lists(), "for-you-ranked"] key, forcing a full
// re-rank/refetch on every repost anywhere in the app.
// ✅ FIXED: For You feed pagination — split into a cached ranked pool
// (computeForYouRankedPool, re-ranked only on staleTime expiry or
// refetch) and pure in-memory pagination (sliceForYouFeedPage) — see
// lib/firestore/posts.ts. refetch is overridden so pull-to-refresh
// re-ranks the pool before re-slicing.
// ✅ FIXED: toggleRepost's real signature is (postId: string, isReposted:
// boolean) — it resolves the current user internally, doesn't take a
// userId argument. Confirmed against lib/firestore/reposts.ts directly.
// ✅ NEW: useMarkNotInterested — backs the "Not interested" post action
// (Phase B of the recommendation-engine work). Optimistically removes the
// post from every mounted feed list, and invalidates the for-you-pool
// query so the muted author/topic takes effect on the next real re-rank.

import { useAuth } from "@/hooks/useAuth";
import { markNotInterested } from "@/lib/firestore/affinity";
import { forYouFeed, type PaginatedPosts } from "@/lib/firestore/posts";
import { toggleRepost } from "@/lib/firestore/reposts";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  detail: (id: string) => [...postKeys.all, "detail", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Feed density preference — compact / standard / relaxed spacing, read
// from user_settings and applied throughout home.tsx's card/skeleton
// spacing.
// ─────────────────────────────────────────────────────────────────────────────

export function useFeedDensity(): "compact" | "standard" | "relaxed" {
  const { user } = useAuth();
  const [density, setDensity] = useState<"compact" | "standard" | "relaxed">(
    "standard",
  );

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection("user_settings")
      .doc(user.uid)
      .onSnapshot((snap) => {
        const d = (snap.data() as any)?.feed_density;
        if (d === "compact" || d === "standard" || d === "relaxed") {
          setDensity(d);
        }
      });
    return () => unsub();
  }, [user?.uid]);

  return density;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keeps the cached "profile" query in sync via a live listener.
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrentUserProfileSync() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection("profiles")
      .doc(user.uid)
      .onSnapshot((snap) => {
        if (!snap.exists()) return;
        qc.setQueryData(["profile", user.uid], {
          id: snap.id,
          ...(snap.data() as any),
        });
      });
    return () => unsub();
  }, [user?.uid, qc]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard chronological feed (Following / Communities tabs)
// ─────────────────────────────────────────────────────────────────────────────

type FeedTab = "for-you" | "following" | "my-community";

async function fetchStandardFeedPage(
  tab: FeedTab,
  communityIds: string[],
  userId: string | undefined,
  cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot | null,
  pageSize: number,
): Promise<{
  posts: any[];
  nextCursor: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
}> {
  let ref = firestore()
    .collection("posts")
    .orderBy("created_at_ts", "desc")
    .limit(pageSize);

  if (tab === "following" && userId) {
    const followSnap = await firestore()
      .collection("follows")
      .where("follower_id", "==", userId)
      .where("status", "==", "accepted")
      .limit(10)
      .get();
    const followingIds = followSnap.docs.map(
      (d) => (d.data() as any).following_id,
    );
    if (followingIds.length === 0) return { posts: [], nextCursor: null };
    ref = ref.where("user_id", "in", followingIds) as any;
  } else if (tab === "my-community" && communityIds.length > 0) {
    ref = ref.where("community_id", "in", communityIds.slice(0, 10)) as any;
  }

  if (cursor) ref = ref.startAfter(cursor) as any;

  const snap = await ref.get();
  const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const nextCursor = snap.docs.length === pageSize ? snap.docs.at(-1)! : null;
  return { posts, nextCursor };
}

export function useInfiniteFeedPosts(
  tab: FeedTab,
  opts: { communityIds: string[] },
) {
  const { user } = useAuth();

  const forYouQuery = useInfiniteForYouFeed({
    enabled: tab === "for-you",
  });

  const standardQuery = useInfiniteQuery({
    queryKey: [...postKeys.lists(), tab, opts.communityIds.join(",")],
    enabled: tab !== "for-you",
    initialPageParam:
      null as FirebaseFirestoreTypes.QueryDocumentSnapshot | null,
    queryFn: ({ pageParam }) =>
      fetchStandardFeedPage(tab, opts.communityIds, user?.uid, pageParam, 20),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return tab === "for-you" ? forYouQuery : standardQuery;
}

// ─────────────────────────────────────────────────────────────────────────────
// For You feed
// ─────────────────────────────────────────────────────────────────────────────

export function useInfiniteForYouFeed(opts?: { enabled?: boolean }) {
  const { user } = useAuth();

  const poolQuery = useQuery({
    queryKey: [...postKeys.lists(), "for-you-pool", user?.uid],
    queryFn: () => forYouFeed.computeForYouRankedPool(user?.uid),
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });

  const infiniteQuery = useInfiniteQuery<PaginatedPosts, Error>({
    queryKey: [...postKeys.lists(), "for-you-ranked", poolQuery.dataUpdatedAt],
    enabled: (opts?.enabled ?? true) && !!poolQuery.data,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      forYouFeed.sliceForYouFeedPage(poolQuery.data!, pageParam as number, 20),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return {
    ...infiniteQuery,
    refetch: async () => {
      await poolQuery.refetch();
      return infiniteQuery.refetch();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Like / Save — optimistic updates, narrow invalidation
// ─────────────────────────────────────────────────────────────────────────────

function patchPostInLists(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: any) => any,
) {
  qc.getQueryCache()
    .findAll({ queryKey: postKeys.lists() })
    .forEach((query) => {
      qc.setQueryData(query.queryKey, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts?.map((p: any) =>
              p.id === postId ? patch(p) : p,
            ),
          })),
        };
      });
    });
}

function removePostFromLists(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  qc.getQueryCache()
    .findAll({ queryKey: postKeys.lists() })
    .forEach((query) => {
      qc.setQueryData(query.queryKey, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts?.filter((p: any) => p.id !== postId),
          })),
        };
      });
    });
}

export function useToggleLike() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      const likeRef = firestore()
        .collection("posts")
        .doc(postId)
        .collection("likes")
        .doc(user.uid);
      const postRef = firestore().collection("posts").doc(postId);

      if (isLiked) {
        await likeRef.delete();
        await postRef.update({
          like_count: firestore.FieldValue.increment(-1),
        });
      } else {
        await likeRef.set({
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        await postRef.update({
          like_count: firestore.FieldValue.increment(1),
        });
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      patchPostInLists(qc, postId, (p) => ({
        ...p,
        is_liked: !isLiked,
        like_count: Math.max(0, (p.like_count ?? 0) + (isLiked ? -1 : 1)),
      }));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      isSaved,
    }: {
      postId: string;
      isSaved: boolean;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      const saveRef = firestore()
        .collection("posts")
        .doc(postId)
        .collection("saves")
        .doc(user.uid);
      const postRef = firestore().collection("posts").doc(postId);

      if (isSaved) {
        await saveRef.delete();
        await postRef.update({
          save_count: firestore.FieldValue.increment(-1),
        });
      } else {
        await saveRef.set({
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        await postRef.update({
          save_count: firestore.FieldValue.increment(1),
        });
      }
    },
    onMutate: async ({ postId, isSaved }) => {
      patchPostInLists(qc, postId, (p) => ({
        ...p,
        is_saved: !isSaved,
        save_count: Math.max(0, (p.save_count ?? 0) + (isSaved ? -1 : 1)),
      }));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repost
// ─────────────────────────────────────────────────────────────────────────────

export function useToggleRepost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      isReposted,
    }: {
      postId: string;
      isReposted: boolean;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      // ✅ toggleRepost's real signature is (postId, isReposted) — it
      // resolves the current user internally rather than taking a userId
      // argument. Confirmed against lib/firestore/reposts.ts directly.
      return toggleRepost(postId, isReposted);
    },
    onMutate: async ({ postId, isReposted }) => {
      patchPostInLists(qc, postId, (p) => ({
        ...p,
        is_reposted: !isReposted,
        repost_count: Math.max(
          0,
          (p.repost_count ?? 0) + (isReposted ? -1 : 1),
        ),
      }));
    },
    onError: (_err, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
    },
    onSettled: (_data, _err, vars) => {
      const uid = user?.uid;
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
      if (uid) {
        qc.invalidateQueries({ queryKey: ["user-reposts", uid] });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete post
// ─────────────────────────────────────────────────────────────────────────────

export function useDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await firestore().collection("posts").doc(postId).delete();
      return postId;
    },
    onSuccess: (postId) => removePostFromLists(qc, postId),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Not interested — Phase B of the recommendation-engine work.
// ─────────────────────────────────────────────────────────────────────────────

export function useMarkNotInterested() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      authorId,
      content,
    }: {
      postId: string;
      authorId: string;
      content: string | null;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      await markNotInterested(user.uid, authorId, content);
      return postId;
    },
    onMutate: async ({ postId }) => {
      // Optimistically remove the post from every mounted feed list
      // immediately, rather than waiting for the next For You re-rank.
      removePostFromLists(qc, postId);
    },
    onSuccess: () => {
      // Force the For You pool to recompute next time it's needed, so
      // the muted author/topics take effect on the next real re-rank
      // (pull-to-refresh or next session).
      qc.invalidateQueries({
        queryKey: [...postKeys.lists(), "for-you-pool"],
      });
    },
  });
}
