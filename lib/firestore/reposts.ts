// lib/firestore/reposts.ts — ✅ FIXED: uses native SDK consistently
import { auth } from "@/lib/firebase";
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
    await Promise.all([
      repostRef.delete(),
      postRef.update({
        repost_count: firestore.FieldValue.increment(-1),
      }),
    ]);
    return false;
  } else {
    const [postSnap, senderSnap] = await Promise.all([
      postRef.get(),
      firestore().collection("profiles").doc(uid).get(),
    ]);

    const postData = postSnap.data() as any;
    const senderData = senderSnap.data() as any;
    const postOwnerId = postData?.user_id ?? postData?.userId;

    const writes: Promise<any>[] = [
      repostRef.set({
        user_id: uid,
        post_id: postId,
        created_at: new Date().toISOString(),
        created_at_ts: firestore.FieldValue.serverTimestamp(),
      }),
      postRef.update({
        repost_count: firestore.FieldValue.increment(1),
      }),
    ];

    if (postOwnerId && postOwnerId !== uid) {
      writes.push(
        firestore()
          .collection("notifications")
          .add({
            type: "repost",
            sender_id: uid,
            receiver_id: postOwnerId,
            post_id: postId,
            is_read: false,
            created_at: new Date().toISOString(),
            created_at_ts: firestore.FieldValue.serverTimestamp(),
            sender: {
              id: uid,
              username: senderData?.username ?? "",
              full_name: senderData?.full_name ?? null,
              avatar_url: senderData?.avatar_url ?? null,
            },
            post: {
              id: postId,
              content: postData?.content ?? "",
            },
          }),
      );
    }
    try {
      await Promise.all(writes);
    } catch (e: any) {
      console.error("[toggleRepost] write failed:", e?.code, e?.message);
      throw e;
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
