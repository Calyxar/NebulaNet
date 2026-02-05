// hooks/usePosts.ts
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
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// SINGLE POST
// ============================================================================

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

// ============================================================================
// INFINITE FEEDS
// ============================================================================

export function useInfinitePosts(filters: Omit<PostFilters, "offset">) {
  const limit = filters.limit ?? 20;

  return useInfiniteQuery<PaginatedPosts, Error>({
    queryKey: postKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPosts({
        ...filters,
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

// ============================================================================
// CREATE / UPDATE / DELETE (OPTIMISTIC)
// ============================================================================

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
        {
          queryKey: postKeys.lists(),
        },
      );

      const tempId = `temp-${Date.now()}`;

      const optimistic: Post = {
        id: tempId,
        user_id: "me",
        title: input.title,
        content: input.content,
        media_urls: input.media?.map((m) => m.uri) ?? [],
        visibility: input.visibility,
        community_id: input.community_id,
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
      if (post) {
        queryClient.setQueryData(postKeys.detail(post.id), post);
      }
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
        {
          queryKey: postKeys.lists(),
        },
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
