// lib/firestore/reposts.ts
import { auth, db } from "@/lib/firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export async function toggleRepost(
  postId: string,
  isReposted: boolean,
): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const repostId = `${uid}_${postId}`;
  const repostRef = doc(db, "reposts", repostId);
  const postRef = doc(db, "posts", postId);

  if (isReposted) {
    await Promise.all([
      deleteDoc(repostRef),
      updateDoc(postRef, { repost_count: increment(-1) }),
    ]);
    return false;
  } else {
    await Promise.all([
      setDoc(repostRef, {
        user_id: uid,
        post_id: postId,
        created_at: new Date().toISOString(),
      }),
      updateDoc(postRef, { repost_count: increment(1) }),
    ]);
    return true;
  }
}

export async function getRepostStatus(postId: string): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const repostId = `${uid}_${postId}`;
  const snap = await getDoc(doc(db, "reposts", repostId));
  return snap.exists();
}
