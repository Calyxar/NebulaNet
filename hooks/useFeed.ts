// hooks/useFeed.ts — FINAL ✅ (no is_public, uses visibility + media_urls + communities.slug)

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
  title?: string | null;
  user_id: string;
  community_id?: string | null;

  visibility: PostVisibility;

  created_at: string;
  updated_at: string;

  like_count: number;
  comment_count: number;
  share_count: number;

  media_urls?: string[];

  user: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };

  community?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
  } | null;

  is_liked?: boolean;
  is_saved?: boolean;
}

interface CreatePostData {
  title?: string;
  content: string;
  community_id?: string | null;
  visibility?: PostVisibility;
  media_urls?: string[];
}

interface FeedFilters {
  type?: "home" | "community" | "user";
  communitySlug?: string; // ✅ real slug now
  username?: string;
  sort?: "newest" | "popular" | "trending";
}

function normalizeVisibility(v: any): PostVisibility {
  if (v === "public" || v === "followers" || v === "private") return v;
  return "public";
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
      .eq("is_visible", true) // ✅ since you have it
      .order("created_at", { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    // community filter by slug
    if (filters.type === "community" && filters.communitySlug) {
      const { data: community } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", filters.communitySlug)
        .single();

      if (community?.id) query = query.eq("community_id", community.id);
    }

    // user filter
    if (filters.type === "user" && filters.username) {
      const { data: userRow } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", filters.username)
        .single();

      if (userRow?.id) query = query.eq("user_id", userRow.id);
    }

    // home feed logic
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

        const orParts: string[] = [];
        orParts.push(`user_id.eq.${user.id}`);
        if (userIds.length > 0)
          orParts.push(`user_id.in.(${userIds.join(",")})`);
        if (communityIds.length > 0)
          orParts.push(`community_id.in.(${communityIds.join(",")})`);

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
      data?.map((post: any) => ({
        ...(post as Post),
        visibility: normalizeVisibility(post.visibility),
        is_liked: user
          ? post.likes?.some((like: any) => like.user_id === user.id)
          : false,
        is_saved: user
          ? post.saves?.some((save: any) => save.user_id === user.id)
          : false,
      })) || [];

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

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: postData.title ?? null,
          content: postData.content,
          community_id: postData.community_id ?? null,
          media_urls: postData.media_urls ?? [],
          visibility: postData.visibility ?? "public",
          is_visible: true,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
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
        .maybeSingle();

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
        .maybeSingle();

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
