// lib/firestore/interactions.ts — FIRESTORE ✅ (COMPLETED + UPDATED)

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

/* =========================
   Helpers
========================= */

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

function n(v: any): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function likeRef(postId: string, uid: string) {
  return db.collection("post_likes").doc(`${postId}_${uid}`);
}

function saveRef(postId: string, uid: string) {
  return db.collection("post_saves").doc(`${postId}_${uid}`);
}

function shareRef(postId: string, uid: string) {
  return db.collection("post_shares").doc(`${postId}_${uid}`);
}

function postDocRef(postId: string) {
  return db.collection("posts").doc(postId);
}

/* =========================
   Likes
========================= */

export async function hasLikedPost(postId: string): Promise<boolean> {
  const uid = requireUid();
  const snap = await likeRef(postId, uid).get();
  return snap.exists();
}

export async function likePost(postId: string): Promise<void> {
  const uid = requireUid();

  await db.runTransaction(async (tx) => {
    const likeDoc = likeRef(postId, uid);
    const postDoc = postDocRef(postId);

    const [likeSnap, postSnap] = await Promise.all([
      tx.get(likeDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (likeSnap.exists()) return;

    const post = postSnap.data() as any;
    const likeCount = n(post.like_count);

    tx.set(likeDoc, {
      post_id: postId,
      user_id: uid,
      created_at: firestore.FieldValue.serverTimestamp(),
    });

    tx.update(postDoc, {
      like_count: likeCount + 1,
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
  });
}

export async function unlikePost(postId: string): Promise<void> {
  const uid = requireUid();

  await db.runTransaction(async (tx) => {
    const likeDoc = likeRef(postId, uid);
    const postDoc = postDocRef(postId);

    const [likeSnap, postSnap] = await Promise.all([
      tx.get(likeDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (!likeSnap.exists()) return;

    const post = postSnap.data() as any;
    const likeCount = n(post.like_count);

    tx.delete(likeDoc);
    tx.update(postDoc, {
      like_count: Math.max(0, likeCount - 1),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
  });
}

/* =========================
   Saves
========================= */

export async function hasSavedPost(postId: string): Promise<boolean> {
  const uid = requireUid();
  const snap = await saveRef(postId, uid).get();
  return snap.exists();
}

export async function savePost(postId: string): Promise<void> {
  const uid = requireUid();

  await db.runTransaction(async (tx) => {
    const saveDoc = saveRef(postId, uid);
    const postDoc = postDocRef(postId);

    const [saveSnap, postSnap] = await Promise.all([
      tx.get(saveDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (saveSnap.exists()) return;

    const post = postSnap.data() as any;
    const saveCount = n(post.save_count);

    tx.set(saveDoc, {
      post_id: postId,
      user_id: uid,
      created_at: firestore.FieldValue.serverTimestamp(),
    });

    tx.update(postDoc, {
      save_count: saveCount + 1,
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
  });
}

export async function unsavePost(postId: string): Promise<void> {
  const uid = requireUid();

  await db.runTransaction(async (tx) => {
    const saveDoc = saveRef(postId, uid);
    const postDoc = postDocRef(postId);

    const [saveSnap, postSnap] = await Promise.all([
      tx.get(saveDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (!saveSnap.exists()) return;

    const post = postSnap.data() as any;
    const saveCount = n(post.save_count);

    tx.delete(saveDoc);
    tx.update(postDoc, {
      save_count: Math.max(0, saveCount - 1),
      updated_at_ts: firestore.FieldValue.serverTimestamp(),
    });
  });
}

/* =========================
   Shares
========================= */

export async function sharePost(postId: string): Promise<void> {
  const uid = requireUid();
  const shareDoc = shareRef(postId, uid);

  await db.runTransaction(async (tx) => {
    const postDoc = postDocRef(postId);
    const [postSnap, existing] = await Promise.all([
      tx.get(postDoc),
      tx.get(shareDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");

    if (!existing.exists()) {
      const post = postSnap.data() as any;
      const shareCount = n(post.share_count);

      tx.set(shareDoc, {
        post_id: postId,
        user_id: uid,
        created_at: firestore.FieldValue.serverTimestamp(),
      });

      tx.update(postDoc, {
        share_count: shareCount + 1,
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  const [postSnap, senderSnap] = await Promise.all([
    db.collection("posts").doc(postId).get(),
    db.collection("users").doc(uid).get(),
  ]);

  const postData = postSnap.data() as any;
  const senderData = senderSnap.data() as any;
  const postOwnerId = postData?.user_id ?? postData?.userId;

  if (postOwnerId && postOwnerId !== uid) {
    await db.collection("notifications").add({
      type: "post_shared",
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
    });
  }
}

/* =========================
   Convenience toggles
========================= */

export async function toggleLike(postId: string): Promise<boolean> {
  const liked = await hasLikedPost(postId);
  if (liked) {
    await unlikePost(postId);
    return false;
  }
  await likePost(postId);
  return true;
}

export async function toggleSave(postId: string): Promise<boolean> {
  const saved = await hasSavedPost(postId);
  if (saved) {
    await unsavePost(postId);
    return false;
  }
  await savePost(postId);
  return true;
}

/* =========================
   Cleanup helpers (optional)
========================= */

export async function removeMyLikeDoc(postId: string): Promise<void> {
  const uid = requireUid();
  await likeRef(postId, uid).delete();
}

export async function removeMySaveDoc(postId: string): Promise<void> {
  const uid = requireUid();
  await saveRef(postId, uid).delete();
}
