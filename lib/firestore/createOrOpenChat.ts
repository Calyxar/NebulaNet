import firestore from "@react-native-firebase/firestore";

export async function createOrOpenChat(
  currentUserId: string,
  otherUserId: string,
): Promise<string> {
  console.log("=== CREATE/OPEN CHAT START ===");
  console.log("Current user ID:", currentUserId);
  console.log("Other user ID:", otherUserId);

  if (!currentUserId || !otherUserId) {
    console.error("Missing user IDs!");
    throw new Error("Both user IDs are required");
  }

  if (currentUserId === otherUserId) {
    console.error("Cannot message yourself!");
    throw new Error("Cannot create conversation with yourself");
  }

  try {
    const participantIds = [currentUserId, otherUserId].sort();
    console.log("Sorted participant IDs:", participantIds);

    console.log("Querying existing conversations...");
    const existingSnap = await firestore()
      .collection("conversations")
      .where("participant_ids", "array-contains", currentUserId)
      .get();

    console.log("Found", existingSnap.size, "conversations with current user");

    for (const doc of existingSnap.docs) {
      const data = doc.data();
      const ids = data.participant_ids || [];
      console.log("Checking conversation:", doc.id, "with participants:", ids);

      if (ids.length === 2 && ids.includes(otherUserId)) {
        console.log("Found existing conversation:", doc.id);
        console.log("=== CREATE/OPEN CHAT COMPLETE (existing) ===");
        return doc.id;
      }
    }

    console.log("No existing conversation found, creating new one...");
    const newConversation = {
      participant_ids: participantIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: null,
      last_message_at: null,
    };

    console.log("New conversation data:", newConversation);
    const docRef = await firestore()
      .collection("conversations")
      .add(newConversation);

    console.log("Created new conversation:", docRef.id);
    console.log("=== CREATE/OPEN CHAT COMPLETE (new) ===");
    return docRef.id;
  } catch (error: any) {
    console.error("=== CREATE/OPEN CHAT ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    throw error;
  }
}
