// lib/firestore/createOrOpenChat.ts — FIXED ✅
// ✅ FIXED: batch.set(doc(participantsRef)) fails — doc() needs an explicit ID
// ✅ FIXED: use doc(db, collection, id) with generated IDs for batch writes
// ✅ FIXED: check conversations where current user is a participant

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

function dmPairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function createOrOpenChat(
  myId: string,
  otherUserId: string,
): Promise<string> {
  if (!myId || !otherUserId) throw new Error("Missing user IDs");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  const pairKey = dmPairKey(myId, otherUserId);

  // Check if conversation already exists
  const existing = await getDocs(
    query(
      collection(db, "conversations"),
      where("is_group", "==", false),
      where("dm_pair_key", "==", pairKey),
      limit(1),
    ),
  );

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  // Create new conversation
  const convoRef = await addDoc(collection(db, "conversations"), {
    is_group: false,
    dm_pair_key: pairKey,
    participant_ids: [myId, otherUserId],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // ✅ FIXED: use explicit doc IDs — batch.set requires doc(db, collection, id)
  const batch = writeBatch(db);

  const p1Ref = doc(collection(db, "conversation_participants"));
  batch.set(p1Ref, {
    conversation_id: convoRef.id,
    user_id: myId,
    joined_at: serverTimestamp(),
    unread_count: 0,
  });

  const p2Ref = doc(collection(db, "conversation_participants"));
  batch.set(p2Ref, {
    conversation_id: convoRef.id,
    user_id: otherUserId,
    joined_at: serverTimestamp(),
    unread_count: 0,
  });

  await batch.commit();

  return convoRef.id;
}
