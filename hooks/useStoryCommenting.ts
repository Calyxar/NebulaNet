// hooks/useStoryCommenting.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

async function createStoryComment(storyId: string, content: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const [commentRef, storySnap, senderSnap] = await Promise.all([
    db.collection("story_comments").add({
      story_id: storyId,
      user_id: user.uid,
      content: content.trim(),
      created_at: firestore.FieldValue.serverTimestamp(),
    }),
    db.collection("stories").doc(storyId).get(),
    // ✅ FIX: was "users" — data lives in "profiles"
    db.collection("profiles").doc(user.uid).get(),
  ]);

  const storyData = storySnap.data() as any;
  const senderData = senderSnap.data() as any;
  const storyOwnerId = storyData?.user_id ?? storyData?.userId;

  if (storyOwnerId && storyOwnerId !== user.uid) {
    await db.collection("notifications").add({
      type: "story_comment",
      sender_id: user.uid,
      receiver_id: storyOwnerId,
      story_id: storyId,
      comment_id: commentRef.id,
      is_read: false,
      created_at: new Date().toISOString(),
      created_at_ts: firestore.FieldValue.serverTimestamp(),
      sender: {
        id: user.uid,
        username: senderData?.username ?? "",
        full_name: senderData?.full_name ?? null,
        avatar_url: senderData?.avatar_url ?? null,
      },
      story: {
        id: storyId,
        content: storyData?.story_content ?? storyData?.content ?? null,
      },
      comment: {
        id: commentRef.id,
        content: content.trim(),
      },
    });
  }

  return {
    id: commentRef.id,
    story_id: storyId,
    user_id: user.uid,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };
}

async function getStoryComments(storyId: string) {
  const snap = await db
    .collection("story_comments")
    .where("story_id", "==", storyId)
    .orderBy("created_at", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

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
