import {
    fetchActiveStories,
    fetchActiveStoriesByUser,
    fetchStoryById,
    markStorySeen,
    type StoryRow,
} from "@/lib/firestore/stories";
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
