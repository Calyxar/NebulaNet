// hooks/useStoryRing.ts
import { useAuth } from "@/hooks/useAuth";
import { useActiveStories } from "@/hooks/useStories";
import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function useSeenStoryIds(currentUserId?: string) {
  return useQuery<Set<string>>({
    queryKey: ["story-seen", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return new Set();
      const snap = await db
        .collection("story_seen")
        .where("viewer_id", "==", currentUserId)
        .get();
      return new Set(
        snap.docs.map((d) => (d.data() as any).story_id as string),
      );
    },
    staleTime: 30_000,
  });
}

export type StoryRingState = "none" | "unseen" | "seen";

export function useStoryRing(targetUserId?: string): StoryRingState {
  const { user } = useAuth();
  const { data: allStories = [] } = useActiveStories();
  const { data: seenIds = new Set<string>() } = useSeenStoryIds(user?.uid);

  return useMemo(() => {
    if (!targetUserId) return "none";
    const userStories = allStories.filter((s) => s.user_id === targetUserId);
    if (userStories.length === 0) return "none";
    const hasUnseen = userStories.some((s) => !seenIds.has(s.id));
    return hasUnseen ? "unseen" : "seen";
  }, [targetUserId, allStories, seenIds]);
}
