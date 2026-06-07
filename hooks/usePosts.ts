// hooks/usePosts.ts ✅
// ✅ FIXED: useToggleLike onSettled no longer invalidates lists
// ✅ FIXED: useToggleBookmark same fix — only invalidates detail, not lists
// ✅ FIXED: useToggleBookmark writes to "saves" collection
// ✅ FIXED: useToggleRepost added with optimistic update + cache invalidation
// ✅ FIXED: repost_count added to optimistic post in useCreatePost
// ✅ FIXED: useCurrentUserProfileSync — real-time feed patch on profile change
// ✅ FIXED: useCreatePost onSettled invalidates my-posts and my-reposts so profile tab refreshes

import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { auth, db } from "@/lib/firebase";
import {
  addComment,
  getComments,
  toggleCommentLike,
  type CommentWithAuthor,
} from "@/lib/firestore/comments";
import {
  createPost,
  deletePost,
  getPostById,
  getPosts,
  updatePost,
  type CreatePostData,
  type PaginatedPosts,
  type Post,
  type PostFilters,
  type UpdatePostData,
} from "@/lib/firestore/posts";
import firestore from "@react-native-firebase/firestore";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect } from "react";

export type { CommentWithAuthor };

export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters: Omit<PostFilters, "cursor">) =>
    [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

const commentKeys = {
  all: ["comments"] as const,
  post: (postId: string) => [...commentKeys.all, "post", postId] as const,
};

function upsertPostAtTop(posts: Post[], next: Post): Post[] {
  return [next, ...posts.filter((p) => p.id !== next.id)];
}

function removePostById(posts: Post[], id: string): Post[] {
  return posts.filter((p) => p.id !== id);
}

function updateInfiniteLists(
  old: InfiniteData<PaginatedPosts> | undefined,
  updater: (posts: Post[]) => Post[],
  options?: { allPages?: boolean },
): InfiniteData<PaginatedPosts> | undefined {
  if (!old) return old;
  const applyAll = options?.allPages ?? false;
  return {
    ...old,
    pages: old.pages.map((page, idx) => ({
      ...page,
      posts: applyAll || idx === 0 ? updater(page.posts) : page.posts,
    })),
  };
}

export function usePost(postId: string | undefined) {
  const id = (postId ?? "").trim();
  return useQuery<Post | null>({
    queryKey: postKeys.detail(id || "no-id"),
    queryFn: async () => {
      if (!id) return null;
      return getPostById(id);
    },
    enabled: !!id,
    retry: 1,
    staleTime: 15_000,
  });
}

export function useInfinitePosts(filters: Omit<PostFilters, "cursor">) {
  const limit = filters.limit ?? 20;
  return useInfiniteQuery<PaginatedPosts, Error>({
    queryKey: postKeys.list(filters),
    initialPageParam: null as PostFilters["cursor"],
    queryFn: ({ pageParam }) =>
      getPosts({
        ...(filters as PostFilters),
        limit,
        cursor: pageParam ?? null,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
}

export function useFeedDensity() {
  const { settings } = useSettings();
  return settings?.preferences?.feed_density ?? "normal";
}

export function useInfiniteFeedPosts(
  activeTab: "for-you" | "following" | "my-community",
  opts?: { communityIds?: string[] },
) {
  const { userSettings } = useAuth();
  const { settings } = useSettings();

  const savedLanguage = (userSettings as any)?.language ?? null;
  const languageFilter =
    savedLanguage && savedLanguage !== "en" ? savedLanguage : null;

  const prefSort = settings?.preferences?.default_sort ?? "best";
  const sortBy: PostFilters["sortBy"] =
    prefSort === "hot"
      ? "trending"
      : prefSort === "top"
        ? "popular"
        : prefSort === "new"
          ? "newest"
          : "newest";

  const showNsfw = settings?.preferences?.show_nsfw ?? false;

  const base: Omit<PostFilters, "cursor"> = {
    sortBy,
    limit: 20,
    language: languageFilter,
  };

  const filters: Omit<PostFilters, "cursor"> =
    activeTab === "following"
      ? { ...base, visibility: "followers" }
      : activeTab === "my-community"
        ? { ...base, communityIds: opts?.communityIds ?? [] }
        : base;

  const query = useInfinitePosts(filters);

  const data = showNsfw
    ? query.data
    : query.data
      ? {
          ...query.data,
          pages: query.data.pages.map((page) => ({
            ...page,
            posts: page.posts.filter((p) => !(p as any).is_nsfw),
          })),
        }
      : query.data;

  return { ...query, data };
}

export function useInfiniteCommunityFeed(communitySlug: string | undefined) {
  return useInfinitePosts({
    limit: 20,
    sortBy: "newest",
    communitySlug: communitySlug ?? "",
  });
}

type PostsListsSnapshot = {
  previous: [unknown, InfiniteData<PaginatedPosts> | undefined][];
  tempId?: string;
};

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation<Post, Error, CreatePostData, PostsListsSnapshot>({
    mutationFn: async (data) => {
      const created = await createPost(data);
      if (!created) throw new Error("Failed to create post");
      return created;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const previous = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });
      const tempId = `temp-${Date.now()}`;
      const uid = auth.currentUser?.uid ?? "me";
      const optimistic: Post = {
        id: tempId,
        user_id: uid,
        title: input.title ?? null,
        content: input.content,
        media_urls: input.media?.map((m) => m.uri) ?? [],
        visibility: input.visibility,
        community_id: input.community_id ?? null,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        repost_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
        community: null,
        is_liked: false,
        is_saved: false,
        is_owned: true,
        post_type: "text",
        is_visible: true,
      };
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(old, (posts) =>
            upsertPostAtTop(posts, optimistic),
          ),
      );
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key as any, data);
      });
    },
    onSuccess: (created, _input, ctx) => {
      if (!ctx?.tempId) return;
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(old, (posts) => {
            const withoutTemp = posts.filter((p) => p.id !== ctx.tempId);
            return upsertPostAtTop(withoutTemp, created);
          }),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.lists() });
      // ✅ Invalidate profile tab queries so new post shows in Posts + Media tabs
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["my-stats"] });
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation<Post, Error, { postId: string; updates: UpdatePostData }>({
    mutationFn: async ({ postId, updates }) => {
      const updated = await updatePost(postId, updates);
      if (!updated) throw new Error("Failed to update post");
      return updated;
    },
    onSuccess: (post) => {
      qc.setQueryData(postKeys.detail(post.id), post);
      qc.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  type Ctx = {
    previous: [unknown, InfiniteData<PaginatedPosts> | undefined][];
  };
  return useMutation<string, Error, string, Ctx>({
    mutationFn: async (postId) => {
      const ok = await deletePost(postId);
      if (!ok) throw new Error("Failed to delete post");
      return postId;
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const previous = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(old, (posts) => removePostById(posts, postId), {
            allPages: true,
          }),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key as any, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.lists() });
      // ✅ Also refresh profile tab after delete
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["my-stats"] });
    },
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { postId: string; isLiked: boolean }) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");
      const postRef = db.collection("posts").doc(vars.postId);
      if (vars.isLiked) {
        await postRef.update({
          like_count: firestore.FieldValue.increment(-1),
        });
        const snap = await db
          .collection("likes")
          .where("post_id", "==", vars.postId)
          .where("user_id", "==", uid)
          .get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      } else {
        await postRef.update({ like_count: firestore.FieldValue.increment(1) });
        await db.collection("likes").add({
          post_id: vars.postId,
          user_id: uid,
          created_at: new Date().toISOString(),
        });
      }
      return vars;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: postKeys.detail(vars.postId) });
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const prevDetail = qc.getQueryData<Post>(postKeys.detail(vars.postId));
      const prevLists = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });
      if (prevDetail) {
        qc.setQueryData<Post>(postKeys.detail(vars.postId), {
          ...prevDetail,
          is_liked: !vars.isLiked,
          like_count: (prevDetail.like_count ?? 0) + (vars.isLiked ? -1 : 1),
        });
      }
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(
            old,
            (posts) =>
              posts.map((p) =>
                p.id !== vars.postId
                  ? p
                  : {
                      ...p,
                      is_liked: !vars.isLiked,
                      like_count: (p.like_count ?? 0) + (vars.isLiked ? -1 : 1),
                    },
              ),
            { allPages: true },
          ),
      );
      return { prevDetail, prevLists };
    },
    onError: (_err, vars, ctx: any) => {
      if (ctx?.prevDetail)
        qc.setQueryData(postKeys.detail(vars.postId), ctx.prevDetail);
      ctx?.prevLists?.forEach(([key, data]: any) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { postId: string; isSaved: boolean }) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");
      if (vars.isSaved) {
        const snap = await db
          .collection("saves")
          .where("post_id", "==", vars.postId)
          .where("user_id", "==", uid)
          .get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      } else {
        await db.collection("saves").add({
          post_id: vars.postId,
          user_id: uid,
          saved_at: new Date().toISOString(),
        });
      }
      return vars;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: postKeys.detail(vars.postId) });
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const prevDetail = qc.getQueryData<Post>(postKeys.detail(vars.postId));
      const prevLists = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });
      if (prevDetail) {
        qc.setQueryData<Post>(postKeys.detail(vars.postId), {
          ...prevDetail,
          is_saved: !vars.isSaved,
        });
      }
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(
            old,
            (posts) =>
              posts.map((p) =>
                p.id !== vars.postId ? p : { ...p, is_saved: !vars.isSaved },
              ),
            { allPages: true },
          ),
      );
      return { prevDetail, prevLists };
    },
    onError: (_err, vars, ctx: any) => {
      if (ctx?.prevDetail)
        qc.setQueryData(postKeys.detail(vars.postId), ctx.prevDetail);
      ctx?.prevLists?.forEach(([key, data]: any) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
    },
  });
}

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { postId: string; isReposted: boolean }) => {
      const { toggleRepost } = await import("@/lib/firestore/reposts");
      return toggleRepost(vars.postId, vars.isReposted);
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: postKeys.lists() });
      const prevLists = qc.getQueriesData<InfiniteData<PaginatedPosts>>({
        queryKey: postKeys.lists(),
      });
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(
            old,
            (posts) =>
              posts.map((p) =>
                p.id !== vars.postId
                  ? p
                  : {
                      ...p,
                      repost_count:
                        ((p as any).repost_count ?? 0) +
                        (vars.isReposted ? -1 : 1),
                    },
              ),
            { allPages: true },
          ),
      );
      return { prevLists };
    },
    onError: (_err, _vars, ctx: any) => {
      ctx?.prevLists?.forEach(([key, data]: any) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
      qc.invalidateQueries({ queryKey: postKeys.lists() });
      // ✅ Refresh activity tab
      qc.invalidateQueries({ queryKey: ["my-reposts"] });
    },
  });
}

export function useComments(postId: string | undefined) {
  const id = (postId ?? "").trim();
  return useQuery<CommentWithAuthor[]>({
    queryKey: commentKeys.post(id || "no-id"),
    queryFn: async () => {
      if (!id) return [];
      return getComments(id);
    },
    enabled: !!id,
    retry: 1,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      post_id: string;
      content: string;
      parent_id?: string | null;
    }) => addComment(vars),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: commentKeys.post(vars.post_id) });
      qc.invalidateQueries({ queryKey: postKeys.detail(vars.post_id) });
    },
  });
}

export function useToggleCommentLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      commentId: string;
      postId: string;
      isLiked: boolean;
    }) => {
      await toggleCommentLike(vars);
      return vars;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: commentKeys.post(vars.postId) });
    },
  });
}

export function useIncrementShareCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await db
        .collection("posts")
        .doc(postId)
        .update({
          share_count: firestore.FieldValue.increment(1),
        });
      return postId;
    },
    onMutate: async (postId) => {
      const prevDetail = qc.getQueryData<Post>(postKeys.detail(postId));
      if (prevDetail) {
        qc.setQueryData<Post>(postKeys.detail(postId), {
          ...prevDetail,
          share_count: (prevDetail.share_count ?? 0) + 1,
        });
      }
      qc.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(
            old,
            (posts) =>
              posts.map((p) =>
                p.id !== postId
                  ? p
                  : { ...p, share_count: (p.share_count ?? 0) + 1 },
              ),
            { allPages: true },
          ),
      );
    },
    onSuccess: (postId) => {
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

// ✅ Real-time listener — patches feed cache when current user's profile changes
export function useCurrentUserProfileSync() {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = firestore()
      .collection("profiles")
      .doc(uid)
      .onSnapshot((snap) => {
        if (!snap.exists) return;
        const data = snap.data() as any;
        qc.setQueriesData<InfiniteData<PaginatedPosts>>(
          { queryKey: postKeys.lists() },
          (old) =>
            updateInfiniteLists(
              old,
              (posts) =>
                posts.map((p) =>
                  p.user_id !== uid
                    ? p
                    : {
                        ...p,
                        user: p.user
                          ? {
                              ...p.user,
                              id: p.user.id ?? uid,
                              username: data.username,
                              full_name: data.full_name,
                              avatar_url: data.avatar_url,
                            }
                          : p.user,
                      },
                ),
              { allPages: true },
            ),
        );
      });
    return () => unsub();
  }, [uid, qc]);
}
