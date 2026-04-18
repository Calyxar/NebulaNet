// lib/firestore/reposts.ts
import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export async function toggleRepost(
  postId: string,
  isReposted: boolean,
): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const repostRef = db.collection("reposts").doc(`${uid}_${postId}`);
  const postRef = db.collection("posts").doc(postId);

  if (isReposted) {
    await Promise.all([
      repostRef.delete(),
      postRef.update({ repost_count: firestore.FieldValue.increment(-1) }),
    ]);
    return false;
  } else {
    await Promise.all([
      repostRef.set({
        user_id: uid,
        post_id: postId,
        created_at: new Date().toISOString(),
      }),
      postRef.update({ repost_count: firestore.FieldValue.increment(1) }),
    ]);
    return true;
  }
}

export async function getRepostStatus(postId: string): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snap = await db.collection("reposts").doc(`${uid}_${postId}`).get();
  return snap.exists();
}