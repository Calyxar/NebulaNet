// hooks/usePosts.ts — COMPLETED + UPDATED (no circular imports)
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
} from "@/lib/queries/posts";
import { supabase } from "@/lib/supabase";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

/* ============================================================================
   QUERY KEYS
   ============================================================================ */

export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

/* ============================================================================
   HELPERS (OPTIMISTIC LIST UPDATES)
   ============================================================================ */

function upsertPostAtTop(posts: Post[], next: Post): Post[] {
  const without = posts.filter((p) => p.id !== next.id);
  return [next, ...without];
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

/* ============================================================================
   SINGLE POST
   ============================================================================ */

export function usePost(postId: string | undefined) {
  return useQuery<Post | null>({
    queryKey: postKeys.detail(postId ?? ""),
    queryFn: () => {
      if (!postId) throw new Error("Post ID required");
      return getPostById(postId);
    },
    enabled: !!postId,
  });
}

/* ============================================================================
   INFINITE FEEDS
   ============================================================================ */

export function useInfinitePosts(filters: Omit<PostFilters, "offset">) {
  const limit = filters.limit ?? 20;

  return useInfiniteQuery<PaginatedPosts, Error>({
    queryKey: postKeys.list(filters as PostFilters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPosts({
        ...(filters as PostFilters),
        limit,
        offset: typeof pageParam === "number" ? pageParam : 0,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.posts.length, 0);
    },
  });
}

export function useInfiniteFeedPosts(
  activeTab: "for-you" | "following" | "my-community",
) {
  const filters: Omit<PostFilters, "offset"> =
    activeTab === "following"
      ? { sortBy: "newest", visibility: "followers", limit: 20 }
      : { sortBy: "newest", limit: 20 };

  return useInfinitePosts(filters);
}

export function useInfiniteCommunityFeed(communitySlug: string | undefined) {
  return useInfinitePosts({
    limit: 20,
    sortBy: "newest",
    communitySlug: communitySlug ?? "",
  });
}

/* ============================================================================
   CREATE / UPDATE / DELETE (OPTIMISTIC)
   ============================================================================ */

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostData) => {
      const created = await createPost(data);
      if (!created) throw new Error("Failed to create post");
      return created;
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: postKeys.lists() });

      const previous = queryClient.getQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
      );

      const tempId = `temp-${Date.now()}`;

      const optimistic: Post = {
        id: tempId,
        user_id: "me",
        title: input.title ?? null,
        content: input.content,
        media_urls: input.media?.map((m) => m.uri) ?? [],
        visibility: input.visibility,
        community_id: input.community_id ?? null,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
        community: null,
        is_liked: false,
        is_saved: false,
        is_owned: true,
      };

      queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
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
        queryClient.setQueryData(key, data);
      });
    },

    onSuccess: (created, _input, ctx) => {
      if (!ctx?.tempId) return;

      queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
        (old) =>
          updateInfiniteLists(old, (posts) => {
            const withoutTemp = posts.filter((p) => p.id !== ctx.tempId);
            return upsertPostAtTop(withoutTemp, created);
          }),
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      updates,
    }: {
      postId: string;
      updates: Partial<CreatePostData>;
    }) => updatePost(postId, updates),

    onSuccess: (post) => {
      if (post) queryClient.setQueryData(postKeys.detail(post.id), post);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const ok = await deletePost(postId);
      if (!ok) throw new Error("Failed to delete post");
      return postId;
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.lists() });

      const previous = queryClient.getQueriesData<InfiniteData<PaginatedPosts>>(
        { queryKey: postKeys.lists() },
      );

      queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
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
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/* ============================================================================
   COMMENTS + INTERACTIONS (Post Detail Screen)
   ============================================================================ */

// ---- Types for comments ----
type ProfileRow = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  like_count?: number | null;
  author: ProfileRow[]; // Supabase relation array
};

export type CommentWithAuthor = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  likes_count: number;
  user_has_liked: boolean;
  author: ProfileRow | null;
  replies?: CommentWithAuthor[];
};

const commentKeys = {
  all: ["comments"] as const,
  post: (postId: string) => [...commentKeys.all, "post", postId] as const,
};

async function fetchComments(postId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      post_id,
      user_id,
      content,
      created_at,
      parent_id,
      like_count,
      author:profiles(id, username, full_name, avatar_url)
    `,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CommentRow[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try to detect which comments the user liked (if comment_likes exists)
  let likedCommentIds = new Set<string>();
  if (user && rows.length) {
    const ids = rows.map((r) => r.id);

    const { data: likes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", ids);

    likedCommentIds = new Set(
      (likes ?? []).map((l: { comment_id: string }) => l.comment_id),
    );
  }

  const normalized: CommentWithAuthor[] = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    user_id: r.user_id,
    content: r.content,
    created_at: r.created_at,
    parent_id: r.parent_id ?? null,
    likes_count: typeof r.like_count === "number" ? r.like_count : 0,
    user_has_liked: likedCommentIds.has(r.id),
    author: r.author?.[0] ?? null,
    replies: [],
  }));

  // 1-level reply nesting
  const byId = new Map(normalized.map((c) => [c.id, c]));
  const topLevel: CommentWithAuthor[] = [];

  for (const c of normalized) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      topLevel.push(c);
    }
  }

  return topLevel;
}

export function useComments(postId: string | undefined) {
  return useQuery<CommentWithAuthor[]>({
    queryKey: commentKeys.post(postId ?? ""),
    queryFn: () => {
      if (!postId) throw new Error("Post ID required");
      return fetchComments(postId);
    },
    enabled: !!postId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id,
          user_id: user.id,
          content,
          parent_id: parent_id ?? null,
          like_count: 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.post(vars.post_id),
      });
      queryClient.invalidateQueries({
        queryKey: postKeys.detail(vars.post_id),
      });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      isLiked,
    }: {
      commentId: string;
      postId: string;
      isLiked: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        });
      }

      return { commentId, postId };
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.post(vars.postId),
      });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id });
      }

      return { postId };
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isSaved,
    }: {
      postId: string;
      isSaved: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isSaved) {
        await supabase
          .from("saves")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("saves")
          .insert({ post_id: postId, user_id: user.id });
      }

      return { postId };
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(vars.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useIncrementShareCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // Simple read->write. If you want atomic, do an RPC later.
      const { data, error } = await supabase
        .from("posts")
        .select("share_count")
        .eq("id", postId)
        .single();

      if (error) throw error;

      const current =
        typeof (data as { share_count: number | null })?.share_count ===
        "number"
          ? (data as { share_count: number }).share_count
          : 0;

      const { error: updateError } = await supabase
        .from("posts")
        .update({ share_count: current + 1 })
        .eq("id", postId);

      if (updateError) throw updateError;

      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
