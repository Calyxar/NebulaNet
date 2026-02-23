// utils/testNotifications.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function createTestNotifications() {
  const user = auth.currentUser;
  if (!user) return;

  const testNotifications = [
    {
      type: "like",
      sender_id: user.uid,
      receiver_id: user.uid,
      post_id: "test-post-1",
      read: false,
    },
    {
      type: "comment",
      sender_id: user.uid,
      receiver_id: user.uid,
      post_id: "test-post-2",
      comment_id: "test-comment-1",
      read: false,
    },
    { type: "follow", sender_id: user.uid, receiver_id: user.uid, read: false },
  ];

  for (const n of testNotifications) {
    await addDoc(collection(db, "notifications"), {
      ...n,
      created_at: serverTimestamp(),
    });
  }

  console.log("✅ Test notifications created");
}
