// lib/firestore/createOrOpenChat.ts — React Native Firebase ✅

import firestore from "@react-native-firebase/firestore";

function dmPairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function createOrOpenChat(
  myId: string,
  otherUserId: string,
): Promise<string> {
  if (!myId || !otherUserId) throw new Error("Missing user IDs");
  if (myId === otherUserId) throw new Error("Cannot DM yourself");

  const pairKey = dmPairKey(myId, otherUserId);

  // Check if conversation already exists
  const existing = await firestore()
    .collection("conversations")
    .where("is_group", "==", false)
    .where("dm_pair_key", "==", pairKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  // Create new conversation
  const convoRef = await firestore()
    .collection("conversations")
    .add({
      is_group: false,
      dm_pair_key: pairKey,
      participant_ids: [myId, otherUserId],
      created_at: firestore.FieldValue.serverTimestamp(),
      updated_at: firestore.FieldValue.serverTimestamp(),
    });

  // Create participant records in batch
  const batch = firestore().batch();

  const p1Ref = firestore().collection("conversation_participants").doc();
  batch.set(p1Ref, {
    conversation_id: convoRef.id,
    user_id: myId,
    joined_at: firestore.FieldValue.serverTimestamp(),
    unread_count: 0,
  });

  const p2Ref = firestore().collection("conversation_participants").doc();
  batch.set(p2Ref, {
    conversation_id: convoRef.id,
    user_id: otherUserId,
    joined_at: firestore.FieldValue.serverTimestamp(),
    unread_count: 0,
  });

  await batch.commit();

  return convoRef.id;
}
