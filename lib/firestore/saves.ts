// lib/firestore/saves.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";

export async function toggleSavePost(postId: string, isSaved: boolean) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;

  const saveId = `${uid}_${postId}`;
  const saveRef = doc(db, "saves", saveId);

  if (isSaved) {
    await deleteDoc(saveRef);
  } else {
    await setDoc(
      saveRef,
      { user_id: uid, post_id: postId, created_at_ts: serverTimestamp() },
      { merge: true },
    );
  }

  return true;
}
