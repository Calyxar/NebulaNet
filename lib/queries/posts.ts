// lib/queries/posts.ts — COMPLETED ✅
// ✅ media_urls + visibility + is_visible + post_type
// ✅ Works with RLS policies
// ✅ Explore/search/home can reliably show posts

import type { MediaItem, MediaType } from "@/components/media/MediaUpload";
import { supabase } from "@/lib/supabase";

export type PostVisibility = "public" | "followers" | "private";
export type PostType = "text" | "image" | "video" | "mixed";

/* =========================================================
   RAW RESPONSE (relations returned as arrays by Supabase)
========================================================= */

export type ProfileRow = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
};

interface SupabasePostResponse {
  id: string;
  user_id: string;

  title?: string | null;
  content: string;

  media_urls: string[];
  visibility: PostVisibility;
  community_id?: string | null;

  post_type?: PostType | null; // ✅ NEW
  is_visible?: boolean | null; // ✅ NEW (you said your table has it)

  like_count: number;
  comment_count: number;
  share_count: number | null;

  created_at: string;
  updated_at: string;

  user: ProfileRow[];
  community?: CommunityRow[] | null;
}

/* =========================================================
   UI SAFE POST
========================================================= */

export interface Post extends Omit<
  SupabasePostResponse,
  "user" | "community" | "share_count"
> {
  user: ProfileRow | null;
  community: CommunityRow | null;
  share_count: number;

  is_liked?: boolean;
  is_saved?: boolean;
  is_owned?: boolean;
}

/* =========================================================
   INPUT TYPES
========================================================= */

export interface PostFilters {
  limit?: number;
  offset?: number;
  communitySlug?: string;
  username?: string;
  userId?: string;

  // If provided, forces that visibility. If omitted, we show:
  // - public visible posts
  // - + own posts (handled by RLS policy + query)
  visibility?: PostVisibility;

  sortBy?: "newest" | "popular" | "trending";
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizePostType(p: {
  post_type?: unknown;
  media_urls?: unknown;
}): PostType {
  const t = p?.post_type;
  if (t === "text" || t === "image" || t === "video" || t === "mixed") return t;

  // fallback inference if DB field missing
  const urls = Array.isArray(p?.media_urls) ? (p.media_urls as string[]) : [];
  if (!urls.length) return "text";
  const hasVideo = urls.some((u) =>
    /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test((u || "").split("?")[0] || ""),
  );
  if (hasVideo && urls.length > 1) return "mixed";
  if (hasVideo) return "video";
  return "image";
}

function normalizeVisibility(p: { visibility?: unknown }): PostVisibility {
  const v = p?.visibility;
  if (v === "public" || v === "followers" || v === "private") return v;
  return "public";
}

function normalizePost(
  post: SupabasePostResponse,
  extras?: Partial<Post>,
): Post {
  return {
    ...post,
    user: post.user?.[0] ?? null,
    community: post.community?.[0] ?? null,
    visibility: normalizeVisibility(post),
    post_type: normalizePostType(post),
    is_visible: typeof post.is_visible === "boolean" ? post.is_visible : true,
    share_count: typeof post.share_count === "number" ? post.share_count : 0,
    ...extras,
  };
}

/* =========================================================
   STORAGE UPLOAD HELPERS (same as your version)
========================================================= */

function isRemoteUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function guessExt(uri: string, fallback: string): string {
  const clean = uri.split("?")[0]?.split("#")[0] ?? uri;
  const last = clean.split(".").pop();
  if (!last || last.length > 8) return fallback;
  return last.toLowerCase();
}

function makeObjectPath(userId: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2);
  return `media/${userId}/${Date.now()}-${rand}.${ext}`;
}

const POST_MEDIA_TYPES: ReadonlySet<MediaType> = new Set([
  "image",
  "video",
  "gif",
]);

async function uploadOneToBucket(
  userId: string,
  item: MediaItem,
  bucket: string,
): Promise<{ publicUrl: string; objectPath: string }> {
  if (isRemoteUrl(item.uri)) return { publicUrl: item.uri, objectPath: "" };

  const res = await fetch(item.uri);
  if (!res.ok) throw new Error("Failed to read media file");
  const blob = await res.blob();

  const fallbackExt =
    item.type === "video"
      ? "mp4"
      : item.type === "audio"
        ? "mp3"
        : item.type === "document"
          ? "pdf"
          : "jpg";

  const ext = guessExt(item.uri, fallbackExt);
  const objectPath = makeObjectPath(userId, ext);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, blob, {
      upsert: false,
      contentType: blob.type || undefined,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error("Failed to get public URL");

  return { publicUrl: data.publicUrl, objectPath };
}

async function uploadMediaForPost(
  userId: string,
  media: MediaItem[] | undefined,
  bucket = "post-media",
): Promise<{ urls: string[]; uploadedObjectPaths: string[] }> {
  if (!media?.length) return { urls: [], uploadedObjectPaths: [] };

  const urls: string[] = [];
  const uploadedObjectPaths: string[] = [];

  for (const item of media) {
    if (!POST_MEDIA_TYPES.has(item.type)) continue;
    const { publicUrl, objectPath } = await uploadOneToBucket(
      userId,
      item,
      bucket,
    );
    urls.push(publicUrl);
    if (objectPath) uploadedObjectPaths.push(objectPath);
  }

  return { urls, uploadedObjectPaths };
}

async function cleanupUploaded(bucket: string, objectPaths: string[]) {
  if (!objectPaths.length) return;
  try {
    await supabase.storage.from(bucket).remove(objectPaths);
  } catch (e) {
    console.warn("cleanupUploaded failed:", e);
  }
}

/* =========================================================
   SELECT
========================================================= */

const POST_SELECT = `
  id,
  user_id,
  title,
  content,
  media_urls,
  visibility,
  community_id,
  post_type,
  is_visible,
  like_count,
  comment_count,
  share_count,
  created_at,
  updated_at,
  user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
  community:communities!posts_community_id_fkey(id, name, slug, avatar_url)
`;

/* =========================================================
   GET POSTS
========================================================= */

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
    sortBy = "newest",
  } = filters;

  let query = supabase.from("posts").select(POST_SELECT, { count: "exact" });

  // ✅ always hide "deleted/hidden" posts
  query = query.eq("is_visible", true);

  // Filter by community slug -> id
  if (communitySlug) {
    const { data } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", communitySlug)
      .single();
    if (data?.id) query = query.eq("community_id", data.id);
  }

  // Filter by username -> id
  if (username) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();
    if (data?.id) query = query.eq("user_id", data.id);
  }

  if (userId) query = query.eq("user_id", userId);

  // ✅ If caller explicitly requests a visibility, apply it.
  // Otherwise, let RLS handle who can see what; but for "public feeds", your UI should pass visibility="public".
  if (visibility) query = query.eq("visibility", visibility);

  switch (sortBy) {
    case "popular":
      query = query.order("like_count", { ascending: false });
      break;
    case "trending": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query
        .gte("created_at", weekAgo.toISOString())
        .order("like_count", { ascending: false });
      break;
    }
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error || !data) return { posts: [], total: 0, hasMore: false };

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  let likedIds: string[] = [];
  let savedIds: string[] = [];

  if (user) {
    const ids = (data as { id: string }[]).map((p) => p.id);

    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", ids),
      supabase
        .from("saves")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", ids),
    ]);

    likedIds =
      (likes as { post_id: string }[] | null)?.map((l) => l.post_id) ?? [];
    savedIds =
      (saves as { post_id: string }[] | null)?.map((s) => s.post_id) ?? [];
  }

  const posts = (data as SupabasePostResponse[]).map((post) =>
    normalizePost(post, {
      is_liked: likedIds.includes(post.id),
      is_saved: savedIds.includes(post.id),
      is_owned: user ? post.user_id === user.id : false,
    }),
  );

  return { posts, total: count ?? 0, hasMore: (count ?? 0) > offset + limit };
}

/* =========================================================
   GET SINGLE POST
========================================================= */

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  let is_liked = false;
  let is_saved = false;

  if (user) {
    const [{ data: like }, { data: save }] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("saves")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    is_liked = !!like;
    is_saved = !!save;
  }

  return normalizePost(data as SupabasePostResponse, {
    is_liked,
    is_saved,
    is_owned: user ? (data as SupabasePostResponse).user_id === user.id : false,
  });
}

/* =========================================================
   CREATE POST
========================================================= */

export async function createPost(postData: {
  title?: string;
  content: string;
  media?: MediaItem[];
  community_id?: string;
  visibility: PostVisibility;
}): Promise<Post | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("User not authenticated");

  const bucket = "post-media";
  const uploaded = await uploadMediaForPost(user.id, postData.media, bucket);

  // determine post_type (optional; DB trigger could do this too)
  const urls = uploaded.urls;
  const hasVideo = urls.some((u) =>
    /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test((u || "").split("?")[0] || ""),
  );
  const post_type: PostType = !urls.length
    ? "text"
    : hasVideo && urls.length > 1
      ? "mixed"
      : hasVideo
        ? "video"
        : "image";

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title: postData.title ?? null,
      content: postData.content,
      community_id: postData.community_id ?? null,
      visibility: postData.visibility,
      media_urls: urls,
      post_type, // ✅ NEW
      is_visible: true, // ✅ keep visible
      like_count: 0,
      comment_count: 0,
      share_count: 0,
    })
    .select(POST_SELECT)
    .single();

  if (error || !data) {
    await cleanupUploaded(bucket, uploaded.uploadedObjectPaths);
    return null;
  }

  return normalizePost(data as SupabasePostResponse, {
    is_owned: true,
    is_liked: false,
    is_saved: false,
  });
}

/* =========================================================
   DELETE POST
========================================================= */

export async function deletePost(postId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("User not authenticated");

  // If you want "soft delete" instead, switch to update is_visible=false
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);
  return !error;
}
