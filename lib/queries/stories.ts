// lib/queries/stories.ts
import { supabase } from "@/lib/supabase";

/* -------------------- TYPES -------------------- */

export type StoryProfile = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles: StoryProfile | null; // ✅ ALWAYS single object
};

/* -------------------- HELPERS -------------------- */

function normalizeProfile(p: any): StoryProfile | null {
  if (!p) return null;
  if (Array.isArray(p)) return (p[0] ?? null) as StoryProfile | null;
  return p as StoryProfile;
}

/* -------------------- FETCH -------------------- */

export async function fetchStoryById(
  storyId: string,
): Promise<StoryRow | null> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      user_id,
      media_url,
      media_type,
      caption,
      created_at,
      expires_at,
      profiles:profiles (
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as any),
    profiles: normalizeProfile((data as any).profiles),
  };
}

export async function fetchActiveStoriesByUser(
  userId: string,
): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      user_id,
      media_url,
      media_type,
      caption,
      created_at,
      expires_at,
      profiles:profiles (
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    profiles: normalizeProfile(row.profiles),
  }));
}

/**
 * Backwards-compatible global fetch (used by home.tsx)
 */
export async function fetchActiveStories(): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      user_id,
      media_url,
      media_type,
      caption,
      created_at,
      expires_at,
      profiles:profiles (
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    profiles: normalizeProfile(row.profiles),
  }));
}

/* -------------------- SEEN TRACKING -------------------- */

export async function markStorySeen(storyId: string) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const { error } = await supabase.from("story_seen").upsert(
    {
      story_id: storyId,
      viewer_id: user.id,
      seen_at: new Date().toISOString(),
    },
    { onConflict: "story_id,viewer_id" },
  );

  if (error) throw error;
}

/* -------------------- UPLOAD -------------------- */

/**
 * MODERN + LEGACY compatible
 * uploadStoryMedia(uri, type)
 * uploadStoryMedia({ uri, mediaType })
 */
export async function uploadStoryMedia(
  uri: string,
  mediaType: "image" | "video",
): Promise<{ publicUrl: string; path: string }>;
export async function uploadStoryMedia(params: {
  uri: string;
  mediaType: "image" | "video";
}): Promise<{ publicUrl: string; path: string }>;
export async function uploadStoryMedia(
  arg1: any,
  arg2?: any,
): Promise<{ publicUrl: string; path: string }> {
  const params =
    typeof arg1 === "string" ? { uri: arg1, mediaType: arg2 } : arg1;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  const { uri, mediaType } = params;

  const ext =
    mediaType === "image"
      ? uri.split(".").pop() || "jpg"
      : uri.split(".").pop() || "mp4";

  const path = `${user.id}/${Date.now()}.${ext}`;

  const res = await fetch(uri);
  const blob = await res.blob();

  const { error } = await supabase.storage.from("stories").upload(path, blob, {
    contentType: mediaType === "image" ? "image/*" : "video/*",
    upsert: false,
  });

  if (error) throw error;

  const { data: url } = supabase.storage.from("stories").getPublicUrl(path);
  if (!url.publicUrl) throw new Error("No public URL");

  return { publicUrl: url.publicUrl, path };
}

/* -------------------- CREATE -------------------- */

/**
 * MODERN + LEGACY compatible
 */
export async function createStory(params: {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
  expiresInHours?: number;
}): Promise<StoryRow>;
export async function createStory(params: {
  media_url: string;
  media_type: "image" | "video";
  caption?: string | null;
  expires_in_hours?: number;
}): Promise<StoryRow>;
export async function createStory(params: any): Promise<StoryRow> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  const mediaUrl = params.mediaUrl ?? params.media_url;
  const mediaType = params.mediaType ?? params.media_type;
  const caption = params.caption ?? null;
  const hours = params.expiresInHours ?? params.expires_in_hours ?? 24;

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { data: inserted, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
      caption,
      expires_at: expiresAt,
    })
    .select(
      `
      id,
      user_id,
      media_url,
      media_type,
      caption,
      created_at,
      expires_at,
      profiles:profiles (
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .single();

  if (error) throw error;

  return {
    ...(inserted as any),
    profiles: normalizeProfile((inserted as any).profiles),
  };
}

/* -------------------- REPLY + NOTIFICATION -------------------- */

export async function sendStoryReply(storyId: string, message: string) {
  const { data } = await supabase.auth.getUser();
  const sender = data.user;
  if (!sender) throw new Error("Not authenticated");

  const text = message.trim();
  if (!text) throw new Error("Empty reply");

  await supabase.from("story_replies").insert({
    story_id: storyId,
    sender_id: sender.id,
    message: text,
  });

  const { data: story } = await supabase
    .from("stories")
    .select("user_id")
    .eq("id", storyId)
    .maybeSingle();

  if (!story || story.user_id === sender.id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", sender.id)
    .maybeSingle();

  const name = profile?.full_name || profile?.username || "Someone";

  await supabase.from("notifications").insert({
    user_id: story.user_id,
    type: "story_reply",
    title: "New story reply",
    body: `${name}: ${text}`,
    data: { storyId, senderId: sender.id },
    is_read: false,
  });
}
