// hooks/useStoryRing.ts
// Returns whether a given user has an active story + whether current user has seen it
// Used to drive the gradient ring on avatars throughout the app

import { useAuth } from "@/hooks/useAuth";
import { useActiveStories } from "@/hooks/useStories";
import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useMemo } from "react";

// Fetch which story IDs the current user has seen
function useSeenStoryIds(currentUserId?: string) {
  return useQuery<Set<string>>({
    queryKey: ["story-seen", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return new Set();
      const snap = await getDocs(
        query(
          collection(db, "story_seen"),
          where("viewer_id", "==", currentUserId),
        ),
      );
      return new Set(
        snap.docs.map((d) => (d.data() as any).story_id as string),
      );
    },
    staleTime: 30_000,
  });
}

export type StoryRingState = "none" | "unseen" | "seen";

/**
 * Returns the ring state for a given user's avatar:
 * - "none"   → user has no active stories
 * - "unseen" → user has stories the current viewer hasn't seen (show gradient ring)
 * - "seen"   → user has stories but all are seen (show gray ring)
 */
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
