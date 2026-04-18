// lib/firestore/saves.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export async function toggleSavePost(postId: string, isSaved: boolean) {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;
  const saveRef = db.collection("saves").doc(`${uid}_${postId}`);

  if (isSaved) {
    await saveRef.delete();
  } else {
    await saveRef.set(
      {
        user_id: uid,
        post_id: postId,
        created_at_ts: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return true;
}
