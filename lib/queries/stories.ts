// lib/queries/stories.ts
import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

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
  profiles: StoryProfile | null;
};

/* -------------------- HELPERS -------------------- */

function normalizeProfile(p: any): StoryProfile | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function guessExt(uri: string, mediaType: "image" | "video") {
  const clean = uri.split("?")[0];
  const parts = clean.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  return ext || (mediaType === "video" ? "mp4" : "jpg");
}

function guessContentType(ext: string, mediaType: "image" | "video") {
  if (mediaType === "video") {
    if (ext === "mov") return "video/quicktime";
    return "video/mp4";
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
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

/* -------------------- SEEN -------------------- */

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

/* -------------------- UPLOAD (FIXED) -------------------- */

/**
 * Android-safe upload
 * Works with content:// and file:// URIs
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

  const { uri, mediaType } = params as {
    uri: string;
    mediaType: "image" | "video";
  };

  const ext = guessExt(uri, mediaType);
  const contentType = guessContentType(ext, mediaType);
  const path = `${user.id}/${Date.now()}.${ext}`;

  // ✅ ANDROID SAFE: no fetch(), no blob()
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const bytes = decode(base64);

  const { error } = await supabase.storage.from("stories").upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data: url } = supabase.storage.from("stories").getPublicUrl(path);
  if (!url.publicUrl) throw new Error("Failed to get public URL");

  return { publicUrl: url.publicUrl, path };
}

/* -------------------- CREATE -------------------- */

export async function createStory(params: {
  media_url: string;
  media_type: "image" | "video";
  caption?: string | null;
  expires_in_hours?: number;
}): Promise<StoryRow> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  const expiresAt = new Date(
    Date.now() + (params.expires_in_hours ?? 24) * 60 * 60 * 1000,
  ).toISOString();

  const { data: inserted, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      media_url: params.media_url,
      media_type: params.media_type,
      caption: params.caption ?? null,
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
