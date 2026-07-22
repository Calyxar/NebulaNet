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
// ✅ FIXED: toggleRepost's real signature is (postId, isReposted) — it
// resolves the current user internally, doesn't take a userId argument.
// ✅ NEW: useMarkNotInterested — backs the "Not interested" post action.
// ✅ NEW: usePost/useComments/useAddComment/useToggleCommentLike +
// CommentWithAuthor type — these back app/post/[id].tsx's imports, which
// were failing to compile entirely (5 missing exports). Follows the same
// patterns already established in this file: postKeys for query keys,
// the likes/{uid} subcollection pattern used for posts, optimistic
// mutation shape matching useToggleLike/useToggleBookmark. Field names
// were inferred from established conventions in this file rather than
// the screen's exact body — flag if any don't match what the screen
// actually expects.

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
      removePostFromLists(qc, postId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...postKeys.lists(), "for-you-pool"],
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Post detail + comments — backs app/post/[id].tsx
// ─────────────────────────────────────────────────────────────────────────────

export type CommentWithAuthor = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  like_count: number;
  user_has_liked: boolean;
  parent_id: string | null;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function tsToIsoLocal(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return new Date().toISOString();
}

export function usePost(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: postKeys.detail(postId),
    enabled: !!postId,
    queryFn: async () => {
      let snap;
      try {
        snap = await firestore().collection("posts").doc(postId).get();
      } catch (e) {
        // ✅ FIX: surface the real error instead of letting it collapse
        // into the same "Post not found" UI as a genuine missing doc.
        // Most likely culprit for "not found even for my own posts":
        // a Firestore rules evaluation failure (e.g. a get() inside a
        // rule helper like isMinor() throwing on a missing/incomplete
        // profile doc), which denies the read outright rather than
        // gracefully evaluating false.
        console.error("usePost: Firestore read failed for", postId, e);
        throw e;
      }
      if (!snap.exists()) return null;
      const x = snap.data() as any;

      let isLiked = false;
      let isSaved = false;
      if (user?.uid) {
        const [likeSnap, saveSnap] = await Promise.all([
          firestore()
            .collection("posts")
            .doc(postId)
            .collection("likes")
            .doc(user.uid)
            .get(),
          firestore()
            .collection("posts")
            .doc(postId)
            .collection("saves")
            .doc(user.uid)
            .get(),
        ]);
        isLiked = likeSnap.exists();
        isSaved = saveSnap.exists();
      }

      return {
        id: snap.id,
        user_id: x.user_id,
        user: x.user ?? null,
        content: x.content ?? "",
        title: x.title ?? undefined,
        media_urls: Array.isArray(x.media_urls) ? x.media_urls : null,
        post_type: x.post_type ?? null,
        created_at: tsToIsoLocal(x.created_at_ts ?? x.created_at),
        like_count: x.like_count ?? 0,
        comment_count: x.comment_count ?? 0,
        share_count: x.share_count ?? 0,
        repost_count: x.repost_count ?? 0,
        save_count: x.save_count ?? 0,
        is_liked: isLiked,
        is_saved: isSaved,
        is_reposted: x.is_reposted ?? false,
        is_repost: x.is_repost ?? false,
        is_nsfw: x.is_nsfw ?? false,
        is_boosted: x.is_boosted ?? false,
        boosted_until: x.boosted_until ? tsToIsoLocal(x.boosted_until) : null,
        quote_post_id: x.quote_post_id ?? null,
        quote_post: x.quote_post ?? null,
        // ✅ FIX: this was the actual crash. The screen renders this
        // directly inline as text (`in {post.community}`) — returning
        // the raw community object here (whatever shape is on the post
        // doc, likely {id, name, slug}) made React Native hard-crash
        // trying to render an object as a JSX child. Returning just the
        // name as a plain string instead. If the screen ALSO needs
        // community.slug elsewhere (e.g. a tappable link to the
        // community), tell me and I'll restructure this properly rather
        // than flattening it away.
        community: x.community?.name ?? null,
      };
    },
  });
}

export function useComments(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["post-comments", postId, user?.uid],
    enabled: !!postId,
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const snap = await firestore()
        .collection("posts")
        .doc(postId)
        .collection("comments")
        .orderBy("created_at_ts", "desc")
        .limit(100)
        .get();

      const comments = await Promise.all(
        snap.docs.map(async (d) => {
          const x = d.data() as any;
          let isLiked = false;
          if (user?.uid) {
            const likeSnap = await d.ref
              .collection("likes")
              .doc(user.uid)
              .get();
            isLiked = likeSnap.exists();
          }
          return {
            id: d.id,
            post_id: postId,
            user_id: x.user_id,
            content: x.content ?? "",
            created_at: tsToIsoLocal(x.created_at_ts ?? x.created_at),
            like_count: x.like_count ?? 0,
            user_has_liked: isLiked,
            parent_id: x.parent_id ?? null,
            author: x.user
              ? {
                  id: x.user_id,
                  username: x.user.username ?? null,
                  full_name: x.user.full_name ?? null,
                  avatar_url: x.user.avatar_url ?? null,
                }
              : null,
          } as CommentWithAuthor;
        }),
      );

      return comments;
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      post_id,
      content,
      parent_id,
    }: {
      post_id: string;
      content: string;
      parent_id?: string | null;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Comment cannot be empty");

      await firestore()
        .collection("posts")
        .doc(post_id)
        .collection("comments")
        .add({
          user_id: user.uid,
          content: trimmed,
          parent_id: parent_id ?? null,
          user: {
            username: profile?.username ?? null,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          },
          like_count: 0,
          created_at: new Date().toISOString(),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection("posts")
        .doc(post_id)
        .update({ comment_count: firestore.FieldValue.increment(1) });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["post-comments", vars.post_id] });
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.post_id) });
    },
  });
}

export function useToggleCommentLike() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
      isLiked,
    }: {
      postId: string;
      commentId: string;
      isLiked: boolean;
    }) => {
      if (!user?.uid) throw new Error("Not signed in");
      const commentRef = firestore()
        .collection("posts")
        .doc(postId)
        .collection("comments")
        .doc(commentId);
      const likeRef = commentRef.collection("likes").doc(user.uid);

      if (isLiked) {
        await likeRef.delete();
        await commentRef.update({
          like_count: firestore.FieldValue.increment(-1),
        });
      } else {
        await likeRef.set({
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        await commentRef.update({
          like_count: firestore.FieldValue.increment(1),
        });
      }
    },
    onMutate: async ({ postId, commentId, isLiked }) => {
      qc.setQueryData(
        ["post-comments", postId, user?.uid],
        (old: CommentWithAuthor[] | undefined) =>
          old?.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  user_has_liked: !isLiked,
                  like_count: Math.max(0, c.like_count + (isLiked ? -1 : 1)),
                }
              : c,
          ),
      );
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({
        queryKey: ["post-comments", vars.postId, user?.uid],
      });
    },
  });
}
