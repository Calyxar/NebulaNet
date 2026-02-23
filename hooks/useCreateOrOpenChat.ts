// hooks/useCreateOrOpenChat.ts — FIREBASE ✅

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

export async function createOrOpenChat(
  myId: string,
  otherUserId: string,
): Promise<string> {
  if (!myId || !otherUserId) throw new Error("Missing user ids");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  // Find existing DM between the two users
  const myParticipations = await getDocs(
    query(
      collection(db, "conversation_participants"),
      where("user_id", "==", myId),
    ),
  );
  const myConvIds = myParticipations.docs.map(
    (d) => (d.data() as any).conversation_id as string,
  );

  for (let i = 0; i < myConvIds.length; i += 10) {
    const batch = myConvIds.slice(i, i + 10);
    const otherSnap = await getDocs(
      query(
        collection(db, "conversation_participants"),
        where("conversation_id", "in", batch),
        where("user_id", "==", otherUserId),
      ),
    );
    if (!otherSnap.empty) {
      // Verify it's a non-group DM
      return (otherSnap.docs[0].data() as any).conversation_id as string;
    }
  }

  // Create a new DM conversation
  const convRef = await addDoc(collection(db, "conversations"), {
    name: null,
    is_group: false,
    avatar_url: null,
    is_online: false,
    is_typing: false,
    is_pinned: false,
    unread_count: 0,
    last_message_id: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const wb = writeBatch(db);
  [myId, otherUserId].forEach((userId) => {
    const ref = doc(collection(db, "conversation_participants"));
    wb.set(ref, {
      conversation_id: convRef.id,
      user_id: userId,
      unread_count: 0,
      joined_at: new Date().toISOString(),
    });
  });
  await wb.commit();

  return convRef.id;
}
