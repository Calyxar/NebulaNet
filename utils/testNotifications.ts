// utils/testNotifications.ts - Test Script
import { supabase } from "@/lib/supabase";

export async function createTestNotifications() {
  const user = await supabase.auth.getUser();
  if (!user.data.user) return;

  const testNotifications = [
    {
      type: "like" as const,
      sender_id: user.data.user.id,
      receiver_id: user.data.user.id,
      post_id: "test-post-1",
      read: false,
    },
    {
      type: "comment" as const,
      sender_id: user.data.user.id,
      receiver_id: user.data.user.id,
      post_id: "test-post-2",
      comment_id: "test-comment-1",
      read: false,
    },
    {
      type: "follow" as const,
      sender_id: user.data.user.id,
      receiver_id: user.data.user.id,
      read: false,
    },
  ];

  for (const notification of testNotifications) {
    await supabase.from("notifications").insert(notification);
  }
  console.log("✅ Test notifications created");
}
