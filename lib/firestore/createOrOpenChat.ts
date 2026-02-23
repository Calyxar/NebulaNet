// lib/firestore/createOrOpenChat.ts — FIRESTORE ✅
// ✅ Replaces Supabase RPC + inserts
// ✅ Finds existing DM between 2 users, otherwise creates it
// ✅ Uses dm_key if present; falls back to array-contains query + client filter

import { db } from "@/lib/firebase";
import { chatQueries } from "@/lib/firestore/chat";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

function makeDmKey(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `${x}_${y}`;
}

export async function createOrOpenChat(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) throw new Error("Missing user ids");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  const dmKey = makeDmKey(myId, otherUserId);

  // 1) Fast path (if you store dm_key on convo docs)
  try {
    const q1 = query(
      collection(db, "conversations"),
      where("is_group", "==", false),
      where("dm_key", "==", dmKey),
      limit(1),
    );
    const snap = await getDocs(q1);
    if (!snap.empty) return snap.docs[0].id;
  } catch {
    // ignore (dm_key might not exist / index missing)
  }

  // 2) Fallback: find among my DMs, filter client-side for otherUserId
  const q2 = query(
    collection(db, "conversations"),
    where("participant_ids", "array-contains", myId),
    where("is_group", "==", false),
    orderBy("updated_at_ts", "desc"),
    limit(50),
  );

  const snap2 = await getDocs(q2);
  for (const d of snap2.docs) {
    const x = d.data() as any;
    const ids: string[] = Array.isArray(x.participant_ids)
      ? x.participant_ids
      : [];
    if (ids.length === 2 && ids.includes(otherUserId)) {
      return d.id;
    }
  }

  // 3) Create new DM conversation
  // NOTE: to fully enable dm_key fast path, you should add dm_key to createConversation later.
  const created = await chatQueries.createConversation(
    [myId, otherUserId],
    null,
    false,
  );
  if (created.error) throw created.error;
  if (!created.data?.id) throw new Error("Failed to create conversation");

  return created.data.id;
}
