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

  const convoRef = await addDoc(collection(db, "conversations"), {
    is_group: false,
    dm_pair_key: pairKey,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const participantsRef = collection(db, "conversation_participants");
  const batch = writeBatch(db);

  batch.set(doc(participantsRef), {
    conversation_id: convoRef.id,
    user_id: myId,
    joined_at: serverTimestamp(),
  });

  batch.set(doc(participantsRef), {
    conversation_id: convoRef.id,
    user_id: otherUserId,
    joined_at: serverTimestamp(),
  });

  await batch.commit();

  return convoRef.id;
}
