import { supabase } from "@/lib/supabase";

export async function createOrOpenChat(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) {
    throw new Error("Missing user ids");
  }

  if (myId === otherUserId) {
    throw new Error("Cannot DM yourself");
  }

  // Single RPC handles:
  // - finding existing DM
  // - creating conversation if missing
  // - inserting participants safely
  const { data, error } = await supabase
    .rpc("create_or_get_dm", {
      other_user_id: otherUserId,
    })
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create or fetch conversation");
  }

  return data as string;
}
