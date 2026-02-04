// hooks/useFeed.ts
import { MediaItem } from "@/components/media/MediaUpload";
import { supabase } from "@/lib/supabase";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export type PostVisibility = "public" | "followers" | "private";

export interface Post {
  id: string;
  content: string;
  title?: string;
  user_id: string;
  community_id?: string;

  // NEW preferred
  visibility?: PostVisibility;

  // OLD legacy
  is_public?: boolean;

  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  media: MediaItem[];
  user: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;

  // handy for UI
  _visibility?: PostVisibility;
}

interface CreatePostData {
  title?: string;
  content: string;
  community_id?: string;

  // NEW preferred
  visibility?: PostVisibility;

  // OLD legacy
  is_public?: boolean;

  media?: MediaItem[];
}

interface FeedFilters {
  type?: "home" | "community" | "user";
  communitySlug?: string;
  username?: string;
  sort?: "newest" | "popular" | "trending";
}

function normalizeVisibility(p: Post): PostVisibility {
  if (p.visibility) return p.visibility;
  return p.is_public === false ? "private" : "public";
}

function applyVisibilityWrite(data: {
  visibility?: PostVisibility;
  is_public?: boolean;
}) {
  if (data.visibility) {
    return {
      visibility: data.visibility,
      is_public: data.visibility === "private" ? false : true,
    };
  }
  if (typeof data.is_public === "boolean") {
    return {
      is_public: data.is_public,
      visibility: data.is_public ? "public" : "private",
    };
  }
  return { visibility: "public" as const, is_public: true };
}

export function useFeed(filters: FeedFilters = { type: "home" }) {
  const queryClient = useQueryClient();
  const PAGE_SIZE = 10;

  const fetchPosts = async ({ pageParam = 0 }) => {
    let query = supabase
      .from("posts")
      .select(
        `
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url),
        likes!left(user_id, post_id),
        saves!left(user_id, post_id)
      `,
      )
      .order("created_at", { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    // community filter
    if (filters.type === "community" && filters.communitySlug) {
      const { data: community } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", filters.communitySlug)
        .single();

      if (community) query = query.eq("community_id", community.id);
    }

    // user filter
    if (filters.type === "user" && filters.username) {
      const { data: userRow } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", filters.username)
        .single();

      if (userRow) query = query.eq("user_id", userRow.id);
    }

    // home feed: followed users OR joined communities OR your own posts
    if (filters.type === "home") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const [{ data: followedUsers }, { data: joinedCommunities }] =
          await Promise.all([
            supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", user.id),
            supabase
              .from("community_members")
              .select("community_id")
              .eq("user_id", user.id),
          ]);

        const userIds = (followedUsers || [])
          .map((f: any) => f.following_id)
          .filter(Boolean);
        const communityIds = (joinedCommunities || [])
          .map((j: any) => j.community_id)
          .filter(Boolean);

        // Build OR safely (Supabase OR breaks on empty in())
        const orParts: string[] = [];

        // include your own posts
        orParts.push(`user_id.eq.${user.id}`);

        if (userIds.length > 0) {
          orParts.push(`user_id.in.(${userIds.join(",")})`);
        }
        if (communityIds.length > 0) {
          orParts.push(`community_id.in.(${communityIds.join(",")})`);
        }

        // Only apply OR if we actually have something (we always have own posts)
        query = query.or(orParts.join(","));
      }
    }

    // sorting
    if (filters.sort === "popular") {
      query = query.order("like_count", { ascending: false });
    } else if (filters.sort === "trending") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
      query = query.order("like_count", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const postsWithStatus: Post[] =
      data?.map((post: any) => {
        const normalized = normalizeVisibility(post as Post);
        return {
          ...(post as Post),
          _visibility: normalized,
          is_liked: user
            ? post.likes?.some((like: any) => like.user_id === user.id)
            : false,
          is_saved: user
            ? post.saves?.some((save: any) => save.user_id === user.id)
            : false,
        };
      }) || [];

    return {
      posts: postsWithStatus,
      nextPage: data?.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", filters],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const createPost = useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const privacyWrite = applyVisibilityWrite({
        visibility: postData.visibility,
        is_public: postData.is_public,
      });

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: postData.title,
          content: postData.content,
          community_id: postData.community_id,
          media: postData.media || [],
          ...privacyWrite,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existingLike } = await supabase
        .from("likes")
        .select("*")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .single();

      if (existingLike) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
        return "unliked";
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
        return "liked";
      }
    },
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existingSave } = await supabase
        .from("saves")
        .select("*")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .single();

      if (existingSave) {
        const { error } = await supabase
          .from("saves")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
        return "unsaved";
      } else {
        const { error } = await supabase
          .from("saves")
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
        return "saved";
      }
    },
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  return {
    posts: feedQuery.data?.pages.flatMap((page) => page.posts) || [],
    isLoading: feedQuery.isLoading,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    hasNextPage: !!feedQuery.hasNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    refetch: feedQuery.refetch,
    createPost,
    toggleLike,
    toggleSave,
  };
}
