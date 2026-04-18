// lib/firestore/likes.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export async function toggleLikePost(postId: string, isLiked: boolean) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;

  const likeRef = db.collection("likes").doc(`${uid}_${postId}`);
  const postRef = db.collection("posts").doc(postId);

  const postSnap = await postRef.get();
  if (!postSnap.exists) throw new Error("Post not found");

  const d = postSnap.data() as any;
  const cur = typeof d.like_count === "number" ? d.like_count : 0;

  if (isLiked) {
    await Promise.all([
      likeRef.delete(),
      postRef.update({ like_count: Math.max(0, cur - 1) }),
    ]);
  } else {
    await Promise.all([
      likeRef.set(
        {
          user_id: uid,
          post_id: postId,
          created_at_ts: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      postRef.update({ like_count: cur + 1 }),
    ]);
  }

  return true;
}
