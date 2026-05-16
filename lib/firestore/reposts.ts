// lib/firestore/reposts.ts — ✅ FIXED: uses native SDK consistently
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export async function toggleRepost(
  postId: string,
  isReposted: boolean,
): Promise<boolean> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const repostRef = firestore().collection("reposts").doc(`${uid}_${postId}`);
  const postRef = firestore().collection("posts").doc(postId);

  if (isReposted) {
    await Promise.all([
      repostRef.delete(),
      postRef.update({
        repost_count: firestore.FieldValue.increment(-1),
      }),
    ]);
    return false;
  } else {
    await Promise.all([
      repostRef.set({
        user_id: uid,
        post_id: postId,
        created_at: new Date().toISOString(),
        created_at_ts: firestore.FieldValue.serverTimestamp(),
      }),
      postRef.update({
        repost_count: firestore.FieldValue.increment(1),
      }),
    ]);
    return true;
  }
}

export async function getRepostStatus(postId: string): Promise<boolean> {
  const uid = auth().currentUser?.uid;
  if (!uid) return false;
  const snap = await firestore()
    .collection("reposts")
    .doc(`${uid}_${postId}`)
    .get();
  return snap.exists();
}

export async function getUserReposts(
  userId: string,
): Promise<{ postId: string; created_at: string }[]> {
  try {
    const snap = await firestore()
      .collection("reposts")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .limit(50)
      .get({ source: "server" });

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        postId: data.post_id,
        created_at: data.created_at ?? new Date().toISOString(),
      };
    });
  } catch (e) {
    console.error("[getUserReposts] ERROR:", e);
    return [];
  }
}
