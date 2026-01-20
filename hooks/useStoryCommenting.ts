// hooks/useStoryCommenting.ts
import { createStoryComment } from "@/lib/supabase";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

interface UseStoryCommentingProps {
  storyId?: string;
  onCommentSuccess?: () => void;
  onCommentError?: (error: Error) => void;
}

export function useStoryCommenting({
  storyId,
  onCommentSuccess,
  onCommentError,
}: UseStoryCommentingProps = {}) {
  const [isCommenting, setIsCommenting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const submitComment = useCallback(
    async (content: string, targetStoryId?: string) => {
      const targetId = targetStoryId || storyId;
      if (!targetId) {
        Alert.alert("Error", "No story selected");
        return false;
      }

      if (!content.trim()) {
        Alert.alert("Error", "Comment cannot be empty");
        return false;
      }

      setIsCommenting(true);
      try {
        // Create the comment in your backend
        const newComment = await createStoryComment(targetId, content);

        // Update local state
        setComments((prev) => [newComment, ...prev]);

        // Call success callback
        onCommentSuccess?.();

        return true;
      } catch (error: any) {
        console.error("Error submitting story comment:", error);

        // Show error to user
        Alert.alert("Error", error.message || "Failed to post comment");

        // Call error callback
        onCommentError?.(error);

        return false;
      } finally {
        setIsCommenting(false);
      }
    },
    [storyId, onCommentSuccess, onCommentError],
  );

  const loadComments = useCallback(
    async (targetStoryId?: string) => {
      const targetId = targetStoryId || storyId;
      if (!targetId) return;

      setIsLoadingComments(true);
      try {
        // Fetch comments from your backend
        // const fetchedComments = await getStoryComments(targetId);
        // setComments(fetchedComments);

        // For now, just set empty array
        setComments([]);
      } catch (error) {
        console.error("Error loading story comments:", error);
      } finally {
        setIsLoadingComments(false);
      }
    },
    [storyId],
  );

  const addQuickReaction = useCallback(
    async (reaction: string, targetStoryId?: string) => {
      return await submitComment(reaction, targetStoryId);
    },
    [submitComment],
  );

  return {
    isCommenting,
    comments,
    isLoadingComments,
    submitComment,
    loadComments,
    addQuickReaction,
    setComments,
  };
}
