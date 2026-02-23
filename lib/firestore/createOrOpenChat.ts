// lib/firestore/createOrOpenChat.ts

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

/**
 * Create or open an existing 1-on-1 chat
 */
export async function createOrOpenChat(
  myId: string,
  otherUserId: string,
): Promise<string> {
  if (!myId || !otherUserId) {
    throw new Error("Missing user IDs");
  }

  if (myId === otherUserId) {
    throw new Error("Cannot DM yourself");
  }

  // 🔎 1️⃣ Check existing conversation (1-on-1 only)
  const conversationsSnap = await getDocs(
    query(collection(db, "conversations"), where("is_group", "==", false)),
  );

  for (const convoDoc of conversationsSnap.docs) {
    const convoId = convoDoc.id;

    const participantsSnap = await getDocs(
      query(
        collection(db, "conversation_participants"),
        where("conversation_id", "==", convoId),
      ),
    );

    const userIds = participantsSnap.docs.map(
      (doc) => doc.data().user_id as string,
    );

    if (
      userIds.length === 2 &&
      userIds.includes(myId) &&
      userIds.includes(otherUserId)
    ) {
      return convoId; // ✅ Found existing
    }
  }

  // 🆕 2️⃣ Create new conversation
  const convoRef = await addDoc(collection(db, "conversations"), {
    is_group: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const batch = writeBatch(db);

  const participantsRef = collection(db, "conversation_participants");

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
