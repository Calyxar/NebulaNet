// hooks/useStories.ts — UPDATED ✅ + useDeleteStory + useCreateStory
import { auth, db } from "@/lib/firebase";
import {
  fetchActiveStories,
  fetchActiveStoriesByUser,
  fetchStoryById,
  markStorySeen,
  type StoryRow,
} from "@/lib/queries/stories";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const storyKeys = {
  all: ["stories"] as const,
  active: () => [...storyKeys.all, "active"] as const,
  byUser: (userId: string) => [...storyKeys.all, "user", userId] as const,
  detail: (id: string) => [...storyKeys.all, "detail", id] as const,
};

export function useActiveStories() {
  return useQuery<StoryRow[]>({
    queryKey: storyKeys.active(),
    queryFn: fetchActiveStories,
    // ✅ Refetch every 30s so new stories from others appear
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useActiveStoriesByUser(userId: string | undefined) {
  return useQuery<StoryRow[]>({
    queryKey: storyKeys.byUser(userId ?? ""),
    queryFn: () => {
      if (!userId) throw new Error("userId required");
      return fetchActiveStoriesByUser(userId);
    },
    enabled: !!userId,
  });
}

export function useStory(storyId: string | undefined) {
  return useQuery<StoryRow | null>({
    queryKey: storyKeys.detail(storyId ?? ""),
    queryFn: () => {
      if (!storyId) throw new Error("storyId required");
      return fetchStoryById(storyId);
    },
    enabled: !!storyId,
  });
}

export function useMarkStorySeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => markStorySeen(storyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.active() });
    },
  });
}

// ✅ FIX: Create story with immediate cache invalidation so it shows on home instantly
export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      media_url: string;
      media_type: "image" | "video";
      caption?: string;
      duration?: number;
    }) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const profileSnap = await db.collection("profiles").doc(user.uid).get();
      const profile = profileSnap.exists() ? (profileSnap.data() as any) : null;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const ref = await db.collection("stories").add({
        user_id: user.uid,
        media_url: data.media_url,
        media_type: data.media_type,
        caption: data.caption ?? null,
        duration: data.duration ?? 5,
        expires_at: firestore.Timestamp.fromDate(expiresAt),
        expires_at_iso: expiresAt.toISOString(),
        seen_by: [],
        like_count: 0,
        comment_count: 0,
        is_visible: true,
        profiles: profile
          ? {
              id: user.uid,
              username: profile.username ?? "",
              full_name: profile.full_name ?? null,
              avatar_url: profile.avatar_url ?? null,
            }
          : null,
        created_at: new Date().toISOString(),
        created_at_ts: firestore.FieldValue.serverTimestamp(),
      });

      return { id: ref.id };
    },
    onSuccess: () => {
      // ✅ FIX: invalidate immediately so story row on home screen updates
      qc.invalidateQueries({ queryKey: storyKeys.active() });
      qc.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}

// ✅ Delete story — only works if current user owns it
export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      await db.collection("stories").doc(storyId).delete();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}
