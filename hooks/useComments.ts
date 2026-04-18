import { getComments } from "@/lib/firestore/comments"; // ✅ FIX: correct path
import { useQuery } from "@tanstack/react-query";

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => {
      if (!postId) throw new Error("Post ID required");
      return getComments(postId);
    },
    enabled: !!postId,
  });
}
