// functions/src/index.ts — PRODUCTION DELETE ACCOUNT ✅
// Deploy with: firebase deploy --only functions

import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

/* =========================================================
   Helper: Safe batched delete by query
   Handles large collections safely (<500 writes per batch)
========================================================= */
async function deleteByQuery(collection: string, field: string, value: string) {
  const snapshot = await db
    .collection(collection)
    .where(field, "==", value)
    .get();

  if (snapshot.empty) return;

  const batchLimit = 400; // Safe margin under Firestore 500 limit
  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    operationCount++;

    if (operationCount >= batchLimit) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

/* =========================================================
   Callable: Delete Account
========================================================= */

export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to delete your account.",
    );
  }

  const userId = request.auth.uid;

  try {
    /* -------------------------------
       1️⃣ Firestore Cleanup
    ------------------------------- */

    await Promise.allSettled([
      // Profile document
      db.collection("profiles").doc(userId).delete(),

      // Related collections
      deleteByQuery("posts", "user_id", userId),
      deleteByQuery("comments", "author_id", userId),
      deleteByQuery("stories", "user_id", userId),
      deleteByQuery("community_members", "user_id", userId),
      deleteByQuery("support_reports", "user_id", userId),
      deleteByQuery("conversation_participants", "user_id", userId),
      deleteByQuery("notifications", "user_id", userId),
    ]);

    /* -------------------------------
       2️⃣ Storage Cleanup
    ------------------------------- */

    try {
      const bucket = storage.bucket();

      await Promise.allSettled([
        bucket.deleteFiles({ prefix: `media/${userId}/` }),
        bucket.deleteFiles({ prefix: `stories/${userId}/` }),
        bucket.deleteFiles({ prefix: `thumbnails/${userId}/` }),
        bucket.deleteFiles({ prefix: `support-screenshots/${userId}/` }),
      ]);
    } catch (storageError) {
      console.error("Storage cleanup error:", storageError);
      // Non-fatal — continue deletion
    }

    /* -------------------------------
       3️⃣ Delete Firebase Auth User
    ------------------------------- */

    await admin.auth().deleteUser(userId);

    return {
      success: true,
      message: "Account deleted successfully",
    };
  } catch (error: any) {
    console.error("Delete account failure:", error);

    throw new HttpsError(
      "internal",
      error?.message || "Failed to delete account",
    );
  }
});
