import { supabase } from "@/lib/supabase";

export async function createOrOpenChat(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) throw new Error("Missing user ids");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  // 1) Check existing convo via RPC
  const { data: existing, error: existingErr } = await supabase
    .rpc("get_existing_conversation", {
      user_a: myId,
      user_b: otherUserId,
    })
    .single();

  if (existingErr) throw existingErr;

  const existingId =
    (existing as any)?.conversation_id ?? (existing as any)?.id ?? null;

  if (existingId) return existingId as string;

  // 2) Create new conversation
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convoErr) throw convoErr;
  if (!convo?.id) throw new Error("Failed to create conversation");

  // 3) Add participants (matches your DB policy/table)
  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: convo.id, user_id: myId },
      { conversation_id: convo.id, user_id: otherUserId },
    ]);

  if (partErr) throw partErr;

  return convo.id as string;
}
