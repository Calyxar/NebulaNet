// hooks/usePosts.ts
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// Types
export type Post = {
  id: string;
  title?: string;
  content: string;
  media_url?: string;
  media_type?: "image" | "video" | "gif";
  author_id: string;
  community_id?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_pinned: boolean;
  author: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
  };
  user_has_liked?: boolean;
  user_has_bookmarked?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  author: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
  user_has_liked?: boolean;
  replies?: Comment[];
};

export type CreatePostInput = {
  title?: string;
  content: string;
  media_url?: string;
  media_type?: "image" | "video" | "gif";
  community_id?: string;
};

export type CreateCommentInput = {
  post_id: string;
  content: string;
  parent_comment_id?: string;
};

// Query Keys
export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters: string) => [...postKeys.lists(), { filters }] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  comments: (postId: string) => ["comments", postId] as const,
  userPosts: (userId: string) => ["posts", "user", userId] as const,
  communityPosts: (communityId: string) =>
    ["posts", "community", communityId] as const,
};

// ============================================================================
// FETCH POSTS
// ============================================================================

/**
 * Fetch a single post by ID
 */
export function usePost(postId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: postKeys.detail(postId || ""),
    queryFn: async () => {
      if (!postId) throw new Error("Post ID is required");

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug),
          likes:post_likes(user_id),
          bookmarks:post_bookmarks(user_id)
        `,
        )
        .eq("id", postId)
        .single();

      if (error) throw error;

      // Check if current user has liked/bookmarked
      const userHasLiked = user
        ? data.likes?.some((like: any) => like.user_id === user.id)
        : false;
      const userHasBookmarked = user
        ? data.bookmarks?.some((bookmark: any) => bookmark.user_id === user.id)
        : false;

      return {
        ...data,
        user_has_liked: userHasLiked,
        user_has_bookmarked: userHasBookmarked,
      } as Post;
    },
    enabled: !!postId,
  });
}

/**
 * Fetch feed posts (home timeline)
 */
export function useFeedPosts(limit: number = 20, offset: number = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: postKeys.list(`feed-${limit}-${offset}`),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug),
          likes:post_likes(user_id),
          bookmarks:post_bookmarks(user_id)
        `,
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map((post: any) => ({
        ...post,
        user_has_liked: user
          ? post.likes?.some((like: any) => like.user_id === user.id)
          : false,
        user_has_bookmarked: user
          ? post.bookmarks?.some(
              (bookmark: any) => bookmark.user_id === user.id,
            )
          : false,
      })) as Post[];
    },
  });
}

/**
 * Fetch posts by a specific user
 */
export function useUserPosts(userId: string | undefined) {
  const { user: currentUser } = useAuth();

  return useQuery({
    queryKey: postKeys.userPosts(userId || ""),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug),
          likes:post_likes(user_id),
          bookmarks:post_bookmarks(user_id)
        `,
        )
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((post: any) => ({
        ...post,
        user_has_liked: currentUser
          ? post.likes?.some((like: any) => like.user_id === currentUser.id)
          : false,
        user_has_bookmarked: currentUser
          ? post.bookmarks?.some(
              (bookmark: any) => bookmark.user_id === currentUser.id,
            )
          : false,
      })) as Post[];
    },
    enabled: !!userId,
  });
}

/**
 * Fetch posts in a specific community
 */
export function useCommunityPosts(communityId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: postKeys.communityPosts(communityId || ""),
    queryFn: async () => {
      if (!communityId) throw new Error("Community ID is required");

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug),
          likes:post_likes(user_id),
          bookmarks:post_bookmarks(user_id)
        `,
        )
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((post: any) => ({
        ...post,
        user_has_liked: user
          ? post.likes?.some((like: any) => like.user_id === user.id)
          : false,
        user_has_bookmarked: user
          ? post.bookmarks?.some(
              (bookmark: any) => bookmark.user_id === user.id,
            )
          : false,
      })) as Post[];
    },
    enabled: !!communityId,
  });
}

// ============================================================================
// FETCH COMMENTS
// ============================================================================

/**
 * Fetch comments for a post
 */
export function useComments(postId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: postKeys.comments(postId || ""),
    queryFn: async () => {
      if (!postId) throw new Error("Post ID is required");

      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          likes:comment_likes(user_id)
        `,
        )
        .eq("post_id", postId)
        .is("parent_comment_id", null) // Only fetch top-level comments
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment: any) => {
          const { data: replies, error: repliesError } = await supabase
            .from("comments")
            .select(
              `
              *,
              author:profiles!author_id(id, username, name, avatar_url),
              likes:comment_likes(user_id)
            `,
            )
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          if (repliesError) throw repliesError;

          return {
            ...comment,
            user_has_liked: user
              ? comment.likes?.some((like: any) => like.user_id === user.id)
              : false,
            replies: replies.map((reply: any) => ({
              ...reply,
              user_has_liked: user
                ? reply.likes?.some((like: any) => like.user_id === user.id)
                : false,
            })),
          };
        }),
      );

      return commentsWithReplies as Comment[];
    },
    enabled: !!postId,
  });
}

// ============================================================================
// CREATE POST
// ============================================================================

/**
 * Create a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!user) throw new Error("User must be authenticated");

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: input.title,
          content: input.content,
          media_url: input.media_url,
          media_type: input.media_type,
          community_id: input.community_id,
          author_id: user.id,
        })
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug)
        `,
        )
        .single();

      if (error) throw error;

      return data as Post;
    },
    onSuccess: () => {
      // Invalidate all post lists to refetch with new post
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

// ============================================================================
// LIKE POST
// ============================================================================

/**
 * Toggle like on a post
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error("User must be authenticated");

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Decrement likes count
        const { error: updateError } = await supabase.rpc(
          "decrement_post_likes",
          {
            post_id: postId,
          },
        );

        if (updateError) throw updateError;
      } else {
        // Like
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;

        // Increment likes count
        const { error: updateError } = await supabase.rpc(
          "increment_post_likes",
          {
            post_id: postId,
          },
        );

        if (updateError) throw updateError;
      }

      return { postId, isLiked: !isLiked };
    },
    onMutate: async ({ postId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: postKeys.detail(postId) });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData<Post>(
        postKeys.detail(postId),
      );

      // Optimistically update
      if (previousPost) {
        queryClient.setQueryData<Post>(postKeys.detail(postId), {
          ...previousPost,
          user_has_liked: !isLiked,
          likes_count: isLiked
            ? previousPost.likes_count - 1
            : previousPost.likes_count + 1,
        });
      }

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(postKeys.detail(postId), context.previousPost);
      }
    },
    onSettled: (data) => {
      // Refetch after mutation
      if (data) {
        queryClient.invalidateQueries({
          queryKey: postKeys.detail(data.postId),
        });
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      }
    },
  });
}

// ============================================================================
// BOOKMARK POST
// ============================================================================

/**
 * Toggle bookmark on a post
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      isBookmarked,
    }: {
      postId: string;
      isBookmarked: boolean;
    }) => {
      if (!user) throw new Error("User must be authenticated");

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("post_bookmarks")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Add bookmark
        const { error } = await supabase.from("post_bookmarks").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;
      }

      return { postId, isBookmarked: !isBookmarked };
    },
    onMutate: async ({ postId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.detail(postId) });

      const previousPost = queryClient.getQueryData<Post>(
        postKeys.detail(postId),
      );

      if (previousPost) {
        queryClient.setQueryData<Post>(postKeys.detail(postId), {
          ...previousPost,
          user_has_bookmarked: !isBookmarked,
        });
      }

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(postKeys.detail(postId), context.previousPost);
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: postKeys.detail(data.postId),
        });
      }
    },
  });
}

// ============================================================================
// ADD COMMENT
// ============================================================================

/**
 * Add a comment to a post
 */
export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!user) throw new Error("User must be authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: input.post_id,
          content: input.content,
          parent_comment_id: input.parent_comment_id,
          author_id: user.id,
        })
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url)
        `,
        )
        .single();

      if (error) throw error;

      // Increment comments count
      const { error: updateError } = await supabase.rpc(
        "increment_post_comments",
        {
          post_id: input.post_id,
        },
      );

      if (updateError) throw updateError;

      return data as Comment;
    },
    onSuccess: (data, variables) => {
      // Refetch comments for this post
      queryClient.invalidateQueries({
        queryKey: postKeys.comments(variables.post_id),
      });
      queryClient.invalidateQueries({
        queryKey: postKeys.detail(variables.post_id),
      });
    },
  });
}

// ============================================================================
// LIKE COMMENT
// ============================================================================

/**
 * Toggle like on a comment
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      if (!user) throw new Error("User must be authenticated");

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Decrement likes count
        const { error: updateError } = await supabase.rpc(
          "decrement_comment_likes",
          {
            comment_id: commentId,
          },
        );

        if (updateError) throw updateError;
      } else {
        // Like
        const { error } = await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        });

        if (error) throw error;

        // Increment likes count
        const { error: updateError } = await supabase.rpc(
          "increment_comment_likes",
          {
            comment_id: commentId,
          },
        );

        if (updateError) throw updateError;
      }

      return { commentId, postId, isLiked: !isLiked };
    },
    onSuccess: (data) => {
      // Refetch comments
      queryClient.invalidateQueries({
        queryKey: postKeys.comments(data.postId),
      });
    },
  });
}

// ============================================================================
// DELETE POST
// ============================================================================

/**
 * Delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("User must be authenticated");

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", user.id); // Only allow deleting own posts

      if (error) throw error;

      return postId;
    },
    onSuccess: () => {
      // Invalidate all post lists
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

// ============================================================================
// UPDATE POST
// ============================================================================

/**
 * Update a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      updates,
    }: {
      postId: string;
      updates: Partial<CreatePostInput>;
    }) => {
      if (!user) throw new Error("User must be authenticated");

      const { data, error } = await supabase
        .from("posts")
        .update({
          title: updates.title,
          content: updates.content,
          media_url: updates.media_url,
          media_type: updates.media_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .eq("author_id", user.id)
        .select(
          `
          *,
          author:profiles!author_id(id, username, name, avatar_url),
          community:communities(id, name, slug)
        `,
        )
        .single();

      if (error) throw error;

      return data as Post;
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(postKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

// ============================================================================
// INCREMENT SHARE COUNT
// ============================================================================

/**
 * Increment share count for a post
 */
export function useIncrementShareCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.rpc("increment_post_shares", {
        post_id: postId,
      });

      if (error) throw error;

      return postId;
    },
    onSuccess: (postId) => {
      // Refetch the post to get updated share count
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}
