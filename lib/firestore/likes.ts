// lib/firestore/likes.ts — FIREBASE ✅
// ✅ FIXED (re-applied — found missing during an audit pass): toggleLikePost
// never created a notification for the post's author. Confirmed earlier
// today by tracing sendPushNotification's Cloud Function logs (zero
// invocations ever, despite a valid FCM token on file) back to the fact
// that no notification document was ever being created for likes.

import { auth, db } from "@/lib/firebase";
import { createNotification } from "@/lib/firestore/notifications";
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

    // ✅ Notify the post's author. createNotification() already no-ops
    // on self-notifications (liking your own post). Fire-and-forget —
    // a notification failing to write should never block the like
    // itself from succeeding.
    const authorId = d.user_id as string | undefined;
    if (authorId) {
      createNotification({
        type: "like",
        receiver_id: authorId,
        sender_id: uid,
        entity_type: "post",
        entity_id: postId,
      }).catch((err) => {
        console.warn("[toggleLikePost] failed to create notification:", err);
      });
    }
  }

  return true;
}
