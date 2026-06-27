// lib/firestore/reposts.ts
// ✅ FIXED (re-applied — found reverted during an audit pass): the repost
// notification was being written manually, inline, with a different
// shape than every other notification type — post_id and a nested
// sender/post object instead of entity_type/entity_id, which is what
// lib/firestore/notifications.ts's docToNotification() actually reads.
// Switched to createNotification() for consistency with likes and
// comments, which also fixes that shape mismatch.

import { auth } from "@/lib/firebase";
import { createNotification } from "@/lib/firestore/notifications";
import firestore from "@react-native-firebase/firestore";

export async function toggleRepost(
  postId: string,
  isReposted: boolean,
): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const repostRef = firestore().collection("reposts").doc(`${uid}_${postId}`);
  const postRef = firestore().collection("posts").doc(postId);

  if (isReposted) {
    const existing = await repostRef.get();
    if (!existing.data()) return false;

    await firestore().runTransaction(async (tx) => {
      const postDoc = await tx.get(postRef);
      const current = postDoc.data()?.repost_count ?? 0;
      tx.delete(repostRef);
      tx.update(postRef, {
        repost_count: Math.max(0, current - 1),
      });
    });
    return false;
  } else {
    const postSnap = await postRef.get();
    const postData = postSnap.data() as any;
    const postOwnerId = postData?.user_id ?? postData?.userId;

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

    // ✅ Uses createNotification() — consistent shape with every other
    // notification type, and it already no-ops on self-notifications
    // (reposting your own post), so no explicit uid check needed here.
    if (postOwnerId) {
      createNotification({
        type: "repost" as any,
        receiver_id: postOwnerId,
        sender_id: uid,
        entity_type: "post",
        entity_id: postId,
      }).catch((err) =>
        console.warn("[toggleRepost] failed to create notification:", err),
      );
    }

    return true;
  }
}

export async function getRepostStatus(postId: string): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snap = await firestore()
    .collection("reposts")
    .doc(`${uid}_${postId}`)
    .get();
  return snap.data() !== undefined;
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
