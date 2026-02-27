// lib/firestore/interactions.ts — FIRESTORE ✅ (COMPLETED + UPDATED)

import { auth, db } from "@/lib/firebase";
import {
    postLikeRef,
    postRef,
    postSaveRef,
    postShareRef,
} from "@/lib/firestore/refs";
import {
    deleteDoc,
    getDoc,
    runTransaction,
    serverTimestamp,
    type DocumentData
} from "firebase/firestore";

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

/* =========================
   Likes
========================= */

export async function hasLikedPost(postId: string): Promise<boolean> {
  const uid = requireUid();
  const snap = await getDoc(postLikeRef(postId, uid));
  return snap.exists();
}

export async function likePost(postId: string): Promise<void> {
  const uid = requireUid();

  await runTransaction(db, async (tx) => {
    const likeDoc = postLikeRef(postId, uid);
    const postDoc = postRef(postId);

    const [likeSnap, postSnap] = await Promise.all([
      tx.get(likeDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");

    // already liked => idempotent
    if (likeSnap.exists()) return;

    const post = postSnap.data() as DocumentData;
    const likeCount = n(post.like_count);

    tx.set(likeDoc, {
      post_id: postId,
      user_id: uid,
      created_at: serverTimestamp(),
    });

    tx.update(postDoc, {
      like_count: likeCount + 1,
      updated_at_ts: serverTimestamp(),
    });
  });
}

export async function unlikePost(postId: string): Promise<void> {
  const uid = requireUid();

  await runTransaction(db, async (tx) => {
    const likeDoc = postLikeRef(postId, uid);
    const postDoc = postRef(postId);

    const [likeSnap, postSnap] = await Promise.all([
      tx.get(likeDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (!likeSnap.exists()) return;

    const post = postSnap.data() as DocumentData;
    const likeCount = n(post.like_count);

    tx.delete(likeDoc);
    tx.update(postDoc, {
      like_count: Math.max(0, likeCount - 1),
      updated_at_ts: serverTimestamp(),
    });
  });
}

/* =========================
   Saves
========================= */

export async function hasSavedPost(postId: string): Promise<boolean> {
  const uid = requireUid();
  const snap = await getDoc(postSaveRef(postId, uid));
  return snap.exists();
}

export async function savePost(postId: string): Promise<void> {
  const uid = requireUid();

  await runTransaction(db, async (tx) => {
    const saveDoc = postSaveRef(postId, uid);
    const postDoc = postRef(postId);

    const [saveSnap, postSnap] = await Promise.all([
      tx.get(saveDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (saveSnap.exists()) return;

    const post = postSnap.data() as DocumentData;
    const saveCount = n(post.save_count);

    tx.set(saveDoc, {
      post_id: postId,
      user_id: uid,
      created_at: serverTimestamp(),
    });

    tx.update(postDoc, {
      save_count: saveCount + 1,
      updated_at_ts: serverTimestamp(),
    });
  });
}

export async function unsavePost(postId: string): Promise<void> {
  const uid = requireUid();

  await runTransaction(db, async (tx) => {
    const saveDoc = postSaveRef(postId, uid);
    const postDoc = postRef(postId);

    const [saveSnap, postSnap] = await Promise.all([
      tx.get(saveDoc),
      tx.get(postDoc),
    ]);

    if (!postSnap.exists()) throw new Error("Post not found");
    if (!saveSnap.exists()) return;

    const post = postSnap.data() as DocumentData;
    const saveCount = n(post.save_count);

    tx.delete(saveDoc);
    tx.update(postDoc, {
      save_count: Math.max(0, saveCount - 1),
      updated_at_ts: serverTimestamp(),
    });
  });
}

/* =========================
   Shares
========================= */

export async function sharePost(postId: string): Promise<void> {
  const uid = requireUid();

  // You can store multiple shares, but using a deterministic doc ID makes it "one per user"
  // If you want MANY share events per user, change doc id to `${postId}_${uid}_${Date.now()}`
  const shareDoc = postShareRef(postId, uid);

  await runTransaction(db, async (tx) => {
    const postDoc = postRef(postId);
    const postSnap = await tx.get(postDoc);

    if (!postSnap.exists()) throw new Error("Post not found");
    const post = postSnap.data() as DocumentData;

    const shareCount = n(post.share_count);

    // If share doc already exists, still allow (idempotent) without incrementing
    const existing = await tx.get(shareDoc);
    if (!existing.exists()) {
      tx.set(shareDoc, {
        post_id: postId,
        user_id: uid,
        created_at: serverTimestamp(),
      });

      tx.update(postDoc, {
        share_count: shareCount + 1,
        updated_at_ts: serverTimestamp(),
      });
    }
  });
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
  await deleteDoc(postLikeRef(postId, uid));
}

export async function removeMySaveDoc(postId: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(postSaveRef(postId, uid));
}
