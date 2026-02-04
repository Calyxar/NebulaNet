// lib/queries/posts.ts
import { MediaItem } from "@/components/media/MediaUpload";
import { supabase } from "@/lib/supabase";
import { deleteMediaItems, uploadMediaItems } from "@/lib/uploads";

export type PostVisibility = "public" | "followers" | "private";

// Define the actual response type from Supabase with joins
interface SupabasePostResponse {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  media: MediaItem[];
  community_id?: string;

  // NEW (preferred)
  visibility?: PostVisibility;

  // OLD (legacy)
  is_public?: boolean;

  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
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
}

export interface Post extends SupabasePostResponse {
  is_liked?: boolean;
  is_saved?: boolean;
  is_owned?: boolean;
}

export interface CreatePostData {
  title?: string;
  content: string;
  media?: MediaItem[];
  community_id?: string;

  // NEW (preferred)
  visibility?: PostVisibility;

  // OLD (legacy)
  is_public?: boolean;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  media?: MediaItem[];

  // NEW (preferred)
  visibility?: PostVisibility;

  // OLD (legacy)
  is_public?: boolean;
}

export interface PostFilters {
  limit?: number;
  offset?: number;
  communitySlug?: string;
  username?: string;
  userId?: string;

  // NEW (preferred) — if you pass this, it will filter
  visibility?: PostVisibility;

  // OLD (legacy)
  isPublic?: boolean;

  sortBy?: "newest" | "popular" | "trending";
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

// Helpers
function normalizeVisibility(p: SupabasePostResponse): PostVisibility {
  if (p.visibility) return p.visibility;
  // legacy fallback
  return p.is_public === false ? "private" : "public";
}

function applyVisibilityWrite(data: {
  visibility?: PostVisibility;
  is_public?: boolean;
}): { visibility?: PostVisibility; is_public?: boolean } {
  // If visibility explicitly provided, prefer it.
  if (data.visibility) {
    // legacy compatibility:
    // public/followers => is_public true
    // private => is_public false
    const legacyIsPublic = data.visibility === "private" ? false : true;
    return { visibility: data.visibility, is_public: legacyIsPublic };
  }

  // If only is_public provided, map to visibility.
  if (typeof data.is_public === "boolean") {
    return {
      is_public: data.is_public,
      visibility: data.is_public ? "public" : "private",
    };
  }

  // Default
  return { visibility: "public", is_public: true };
}

// Get posts with filters
export async function getPosts(
  filters: PostFilters = {},
): Promise<PaginatedPosts> {
  const {
    limit = 20,
    offset = 0,
    communitySlug,
    username,
    userId,
    visibility,
    isPublic,
    sortBy = "newest",
  } = filters;

  let query = supabase.from("posts").select(
    `
      *,
      user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
      community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
    `,
    { count: "exact" },
  );

  // Apply filters
  if (communitySlug) {
    const { data: community } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", communitySlug)
      .single();

    if (community) query = query.eq("community_id", community.id);
  }

  if (username) {
    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (user) query = query.eq("user_id", user.id);
  }

  if (userId) query = query.eq("user_id", userId);

  // NEW: visibility filter (only if you explicitly request it)
  if (visibility) query = query.eq("visibility", visibility);

  // OLD: isPublic filter (legacy)
  if (isPublic !== undefined) query = query.eq("is_public", isPublic);

  // Sorting
  switch (sortBy) {
    case "popular":
      query = query.order("like_count", { ascending: false });
      break;
    case "trending": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
      query = query.order("like_count", { ascending: false });
      break;
    }
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data: posts, error, count } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return { posts: [], total: 0, hasMore: false };
  }

  // Likes/saves flags
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && posts && posts.length > 0) {
    const { data: likedPosts } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in(
        "post_id",
        posts.map((p: any) => p.id),
      );

    const { data: savedPosts } = await supabase
      .from("saves")
      .select("post_id")
      .eq("user_id", user.id)
      .in(
        "post_id",
        posts.map((p: any) => p.id),
      );

    const likedPostIds = likedPosts?.map((lp: any) => lp.post_id) || [];
    const savedPostIds = savedPosts?.map((sp: any) => sp.post_id) || [];

    const postsWithFlags: Post[] = posts.map((post: SupabasePostResponse) => ({
      ...post,
      visibility: normalizeVisibility(post),
      is_liked: likedPostIds.includes(post.id),
      is_saved: savedPostIds.includes(post.id),
      is_owned: post.user_id === user.id,
    }));

    return {
      posts: postsWithFlags,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  return {
    posts: (posts || []).map((p: SupabasePostResponse) => ({
      ...p,
      visibility: normalizeVisibility(p),
    })) as Post[],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

// Get single post by ID
export async function getPostById(id: string): Promise<Post | null> {
  const { data: post, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
      community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: like } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .single();

    const { data: save } = await supabase
      .from("saves")
      .select("*")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .single();

    return {
      ...(post as any),
      visibility: normalizeVisibility(post as any),
      is_liked: !!like,
      is_saved: !!save,
      is_owned: (post as any).user_id === user.id,
    } as Post;
  }

  return {
    ...(post as any),
    visibility: normalizeVisibility(post as any),
  } as Post;
}

// Create a new post
export async function createPost(
  postData: CreatePostData,
): Promise<Post | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let media = postData.media || [];
    if (media.length > 0) {
      media = await uploadMediaItems(media, {
        compressImages: true,
        generateThumbnails: true,
      });
    }

    const privacyWrite = applyVisibilityWrite({
      visibility: postData.visibility,
      is_public: postData.is_public,
    });

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        title: postData.title,
        content: postData.content,
        media,
        community_id: postData.community_id,

        // write both (new + legacy) safely
        ...privacyWrite,

        like_count: 0,
        comment_count: 0,
        share_count: 0,
      })
      .select(
        `
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      `,
      )
      .single();

    if (error) throw error;

    await supabase.rpc("increment_post_count", { user_id: user.id });

    const typed = post as SupabasePostResponse;

    return {
      ...typed,
      visibility: normalizeVisibility(typed),
      is_liked: false,
      is_saved: false,
      is_owned: true,
    } as Post;
  } catch (error) {
    console.error("Error creating post:", error);
    return null;
  }
}

// Update a post
export async function updatePost(
  id: string,
  updates: UpdatePostData,
): Promise<Post | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: existingPost } = await supabase
      .from("posts")
      .select("user_id, media")
      .eq("id", id)
      .single();

    if (!existingPost || existingPost.user_id !== user.id) {
      throw new Error("Not authorized to update this post");
    }

    // media updates
    let media = updates.media;
    if (media && media.length > 0) {
      const oldMedia = existingPost.media || [];
      await deleteMediaItems(oldMedia);

      media = await uploadMediaItems(media, {
        compressImages: true,
        generateThumbnails: true,
      });
    }

    const privacyWrite = applyVisibilityWrite({
      visibility: updates.visibility,
      is_public: updates.is_public,
    });

    const updateData: any = {
      title: updates.title,
      content: updates.content,
      community_id: undefined, // do not allow change unless you want it
      ...privacyWrite,
      updated_at: new Date().toISOString(),
    };

    if (media) updateData.media = media;

    // Remove undefined keys so Supabase doesn't overwrite with null
    Object.keys(updateData).forEach(
      (k) => updateData[k] === undefined && delete updateData[k],
    );

    const { data: post, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
        community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
      `,
      )
      .single();

    if (error) throw error;

    const typed = post as SupabasePostResponse;

    return {
      ...typed,
      visibility: normalizeVisibility(typed),
      is_owned: true,
    } as Post;
  } catch (error) {
    console.error("Error updating post:", error);
    return null;
  }
}

// Delete a post
export async function deletePost(id: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: post } = await supabase
      .from("posts")
      .select("user_id, media")
      .eq("id", id)
      .single();

    if (!post) throw new Error("Post not found");
    if (post.user_id !== user.id) throw new Error("Not authorized");

    if (post.media && post.media.length > 0) {
      await deleteMediaItems(post.media);
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;

    await supabase.rpc("decrement_post_count", { user_id: user.id });

    return true;
  } catch (error) {
    console.error("Error deleting post:", error);
    return false;
  }
}
