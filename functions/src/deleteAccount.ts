import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const db = admin.firestore();
const storage = admin.storage();

async function deleteByQuery(
  collectionName: string,
  field: string,
  value: string,
) {
  const snap = await db
    .collection(collectionName)
    .where(field, "==", value)
    .get();
  if (snap.empty) return;

  const batchLimit = 400;
  let batch = db.batch();
  let ops = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops++;
    if (ops >= batchLimit) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

export const deleteAccount = functions.https.onCall(
  async (request: any) => {
    const context = request.auth;
    if (!context.auth)
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in.",
      );

    const userId = context.auth.uid;

    try {
      await Promise.allSettled([
        db.collection("profiles").doc(userId).delete(),
        deleteByQuery("posts", "user_id", userId),
        deleteByQuery("comments", "author_id", userId),
        deleteByQuery("stories", "user_id", userId),
        deleteByQuery("community_members", "user_id", userId),
        deleteByQuery("support_reports", "user_id", userId),
        deleteByQuery("conversation_participants", "user_id", userId),
        deleteByQuery("notifications", "user_id", userId),
      ]);

      try {
        const bucket = storage.bucket();
        await Promise.allSettled([
          bucket.deleteFiles({ prefix: `media/${userId}/` }),
          bucket.deleteFiles({ prefix: `stories/${userId}/` }),
          bucket.deleteFiles({ prefix: `thumbnails/${userId}/` }),
          bucket.deleteFiles({ prefix: `support-screenshots/${userId}/` }),
        ]);
      } catch {}

      await admin.auth().deleteUser(userId);
      return { success: true };
    } catch (e: any) {
      throw new functions.https.HttpsError(
        "internal",
        e?.message || "Failed to delete account",
      );
    }
  },
);
