// utils/testNotifications.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

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
    await db.collection("notifications").add({
      ...n,
      created_at: firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Test notifications created");
}
