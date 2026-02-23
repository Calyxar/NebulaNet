// hooks/useStoryCommenting.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

interface UseStoryCommentingProps {
  storyId?: string;
  onCommentSuccess?: () => void;
  onCommentError?: (error: Error) => void;
}

async function createStoryComment(storyId: string, content: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const ref = await addDoc(collection(db, "story_comments"), {
    story_id: storyId,
    user_id: user.uid,
    content: content.trim(),
    created_at: serverTimestamp(),
  });

  return {
    id: ref.id,
    story_id: storyId,
    user_id: user.uid,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };
}

async function getStoryComments(storyId: string) {
  const snap = await getDocs(
    query(
      collection(db, "story_comments"),
      where("story_id", "==", storyId),
      orderBy("created_at", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        const newComment = await createStoryComment(targetId, content);
        setComments((prev) => [newComment, ...prev]);
        onCommentSuccess?.();
        return true;
      } catch (error: any) {
        console.error("Error submitting story comment:", error);
        Alert.alert("Error", error.message || "Failed to post comment");
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
        const fetched = await getStoryComments(targetId);
        setComments(fetched);
      } catch (error) {
        console.error("Error loading story comments:", error);
      } finally {
        setIsLoadingComments(false);
      }
    },
    [storyId],
  );

  const addQuickReaction = useCallback(
    async (reaction: string, targetStoryId?: string) =>
      submitComment(reaction, targetStoryId),
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
