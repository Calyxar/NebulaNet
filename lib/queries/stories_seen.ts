// lib/queries/stories_seen.ts
import { supabase } from "@/lib/supabase";

export type StorySeenViewer = {
  viewer_id: string;
  seen_at: string;
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchStorySeenViewers(
  storyId: string,
): Promise<StorySeenViewer[]> {
  // Join story_seen -> profiles by viewer_id
  // NOTE: Supabase relationship might return arrays, so we normalize
  const { data, error } = await supabase
    .from("story_seen")
    .select(
      `
      viewer_id,
      seen_at,
      profile:profiles ( username, full_name, avatar_url )
    `,
    )
    .eq("story_id", storyId)
    .order("seen_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    viewer_id: row.viewer_id,
    seen_at: row.seen_at,
    profile: Array.isArray(row.profile)
      ? (row.profile[0] ?? null)
      : (row.profile ?? null),
  }));
}
