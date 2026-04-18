// lib/firestore/blocks.ts — CLEANUP AFTER BLOCK ✅
// Mirrors your old Supabase trigger behavior client-side.

import { db } from "@/lib/firebase";

/**
 * Deletes any follows between A and B (both directions).
 * Also deletes follow notifications between them (both directions).
 * NOTE: If you have follow requests, add them here too.
 */
export async function cleanupAfterBlock(myId: string, targetId: string) {
  if (!myId || !targetId) return;

  // 1) Remove follows A->B and B->A
  const [s1, s2] = await Promise.all([
    db
      .collection("follows")
      .where("follower_id", "==", myId)
      .where("following_id", "==", targetId)
      .limit(25)
      .get(),
    db
      .collection("follows")
      .where("follower_id", "==", targetId)
      .where("following_id", "==", myId)
      .limit(25)
      .get(),
  ]);

  await Promise.all([
    ...s1.docs.map((d) => d.ref.delete()),
    ...s2.docs.map((d) => d.ref.delete()),
  ]);

  // 2) Remove notifications between them
  const [ns1, ns2] = await Promise.all([
    db
      .collection("notifications")
      .where("sender_id", "==", myId)
      .where("receiver_id", "==", targetId)
      .limit(50)
      .get(),
    db
      .collection("notifications")
      .where("sender_id", "==", targetId)
      .where("receiver_id", "==", myId)
      .limit(50)
      .get(),
  ]);

  await Promise.all([
    ...ns1.docs.map((d) => d.ref.delete()),
    ...ns2.docs.map((d) => d.ref.delete()),
  ]);

  // 3) OPTIONAL: story seen cleanup (if you store /stories/{id}/seen/{viewerId})
  // This requires knowing storyIds. Most apps skip this cleanup; it's not critical.
}
