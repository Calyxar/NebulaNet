// lib/firestore/createOrOpenChat.ts — REACT NATIVE FIREBASE ✅
import firestore from "@react-native-firebase/firestore";

export async function createOrOpenChat(
  currentUserId: string,
  otherUserId: string,
): Promise<string> {
  console.log("=== CREATE/OPEN CHAT START ===");
  console.log("Current user ID:", currentUserId);
  console.log("Other user ID:", otherUserId);

  if (!currentUserId || !otherUserId) {
    throw new Error("Both user IDs are required");
  }
  if (currentUserId === otherUserId) {
    throw new Error("Cannot create conversation with yourself");
  }

  try {
    const pairKey = [currentUserId, otherUserId].sort().join("__");
    console.log("Pair key:", pairKey);

    // Check if a DM already exists between these two users
    const existing = await firestore()
      .collection("conversations")
      .where("is_group", "==", false)
      .where("dm_pair_key", "==", pairKey)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log("Found existing conversation:", existing.docs[0].id);
      console.log("=== CREATE/OPEN CHAT COMPLETE (existing) ===");
      return existing.docs[0].id;
    }

    console.log("No existing conversation, creating new one...");

    // Create the conversation document
    const convRef = await firestore()
      .collection("conversations")
      .add({
        name: null,
        is_group: false,
        dm_pair_key: pairKey,
        participant_ids: [currentUserId, otherUserId],
        avatar_url: null,
        is_online: false,
        is_typing: false,
        is_pinned: false,
        unread_count: 0,
        last_message_id: null,
        last_message: null,
        last_message_at: null,
        created_at: firestore.FieldValue.serverTimestamp(),
        updated_at: firestore.FieldValue.serverTimestamp(),
        created_at_ts: firestore.FieldValue.serverTimestamp(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });

    console.log("Created conversation:", convRef.id);

    // Create per-participant subcollection docs (for unread counts, etc.)
    const batch = firestore().batch();
    [currentUserId, otherUserId].forEach((userId) => {
      const partRef = firestore()
        .collection("conversations")
        .doc(convRef.id)
        .collection("participants")
        .doc(userId);
      batch.set(partRef, {
        user_id: userId,
        unread_count: 0,
        joined_at: firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    console.log("Participant docs created");
    console.log("=== CREATE/OPEN CHAT COMPLETE (new) ===");
    return convRef.id;
  } catch (error: any) {
    console.error("=== CREATE/OPEN CHAT ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    throw error;
  }
}
