// lib/firestore/blocks.ts — CLEANUP AFTER BLOCK ✅
// Mirrors your old Supabase trigger behavior client-side.

import { db } from "@/lib/firebase";
import {
    collection,
    deleteDoc,
    getDocs,
    limit,
    query,
    where
} from "firebase/firestore";

/**
 * Deletes any follows between A and B (both directions).
 * Also deletes follow notifications between them (both directions).
 * NOTE: If you have follow requests, add them here too.
 */
export async function cleanupAfterBlock(myId: string, targetId: string) {
  if (!myId || !targetId) return;

  // 1) Remove follows A->B and B->A
  const q1 = query(
    collection(db, "follows"),
    where("follower_id", "==", myId),
    where("following_id", "==", targetId),
    limit(25),
  );

  const q2 = query(
    collection(db, "follows"),
    where("follower_id", "==", targetId),
    where("following_id", "==", myId),
    limit(25),
  );

  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  await Promise.all([
    ...s1.docs.map((d) => deleteDoc(d.ref)),
    ...s2.docs.map((d) => deleteDoc(d.ref)),
  ]);

  // 2) Remove notifications between them (follow + any other types you store)
  // If you have a lot of notifications, keep the limit modest and repeat if needed.
  const n1 = query(
    collection(db, "notifications"),
    where("sender_id", "==", myId),
    where("receiver_id", "==", targetId),
    limit(50),
  );

  const n2 = query(
    collection(db, "notifications"),
    where("sender_id", "==", targetId),
    where("receiver_id", "==", myId),
    limit(50),
  );

  const [ns1, ns2] = await Promise.all([getDocs(n1), getDocs(n2)]);

  await Promise.all([
    ...ns1.docs.map((d) => deleteDoc(d.ref)),
    ...ns2.docs.map((d) => deleteDoc(d.ref)),
  ]);

  // 3) OPTIONAL: story seen cleanup (if you store /stories/{id}/seen/{viewerId})
  // This requires knowing storyIds. Most apps skip this cleanup; it’s not critical.
}
