// lib/firestore/likes.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import {
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

export async function toggleLikePost(postId: string, isLiked: boolean) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;

  const likeId = `${uid}_${postId}`;
  const likeRef = doc(db, "likes", likeId);
  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error("Post not found");

  const d = postSnap.data() as any;
  const cur = typeof d.like_count === "number" ? d.like_count : 0;

  if (isLiked) {
    await Promise.all([
      deleteDoc(likeRef),
      updateDoc(postRef, { like_count: Math.max(0, cur - 1) }),
    ]);
  } else {
    await Promise.all([
      setDoc(
        likeRef,
        { user_id: uid, post_id: postId, created_at_ts: serverTimestamp() },
        { merge: true },
      ),
      updateDoc(postRef, { like_count: cur + 1 }),
    ]);
  }

  return true;
}
