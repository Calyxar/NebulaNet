// hooks/useStories.ts — ✅ FIXED: uses native Firebase SDK consistently for create
import {
  fetchActiveStories,
  fetchActiveStoriesByUser,
  fetchStoryById,
  markStorySeen,
  type StoryRow,
} from "@/lib/queries/stories";
import auth from "@react-native-firebase/auth";
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
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnMount: "always",
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

// ✅ FIXED: uses @react-native-firebase (native SDK) consistently —
// same SDK as fetchActiveStories so writes are immediately visible to reads
export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      media_url: string;
      media_type: "image" | "video";
      caption?: string;
      duration?: number;
    }) => {
      // ✅ native SDK auth
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      // ✅ native SDK Firestore profile fetch
      const profileSnap = await firestore()
        .collection("profiles")
        .doc(user.uid)
        .get();
      const profile = profileSnap.exists() ? (profileSnap.data() as any) : null;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date().toISOString();

      // ✅ native SDK Firestore write — same SDK as fetchActiveStories
      const ref = await firestore()
        .collection("stories")
        .add({
          user_id: user.uid,
          media_url: data.media_url,
          media_type: data.media_type,
          caption: data.caption ?? null,
          duration: data.duration ?? 5,
          expires_at_ts: firestore.Timestamp.fromDate(expiresAt),
          created_at_ts: firestore.FieldValue.serverTimestamp(),
          created_at: now,
          seen_by: [],
          like_count: 0,
          comment_count: 0,
          is_visible: true,
          profiles: profile
            ? {
                username: profile.username ?? null,
                full_name: profile.full_name ?? null,
                avatar_url: profile.avatar_url ?? null,
              }
            : null,
        });

      return { id: ref.id };
    },
    onSuccess: () => {
      // ✅ force immediate refetch so home screen story row updates
      qc.refetchQueries({ queryKey: storyKeys.active() });
      qc.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");
      await firestore().collection("stories").doc(storyId).delete();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}
