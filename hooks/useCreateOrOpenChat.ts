// hooks/useCreateOrOpenChat.ts — React Native Firebase ✅

import firestore from "@react-native-firebase/firestore";

export async function createOrOpenChat(
  myId: string,
  otherUserId: string,
): Promise<string> {
  if (!myId || !otherUserId) throw new Error("Missing user ids");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  const pairKey = [myId, otherUserId].sort().join("__");

  // Check if DM already exists
  const existing = await firestore()
    .collection("conversations")
    .where("is_group", "==", false)
    .where("dm_pair_key", "==", pairKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  // Create new DM conversation
  const convRef = await firestore()
    .collection("conversations")
    .add({
      name: null,
      is_group: false,
      dm_pair_key: pairKey,
      participant_ids: [myId, otherUserId],
      avatar_url: null,
      is_online: false,
      is_typing: false,
      is_pinned: false,
      unread_count: 0,
      last_message_id: null,
      created_at: firestore.FieldValue.serverTimestamp(),
      updated_at: firestore.FieldValue.serverTimestamp(),
    });

  const batch = firestore().batch();
  [myId, otherUserId].forEach((userId) => {
    const ref = firestore().collection("conversation_participants").doc();
    batch.set(ref, {
      conversation_id: convRef.id,
      user_id: userId,
      unread_count: 0,
      joined_at: firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  return convRef.id;
}
