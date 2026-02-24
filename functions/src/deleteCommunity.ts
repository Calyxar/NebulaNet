import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const db = admin.firestore();

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

export const deleteCommunity = functions.https.onCall(async (request: any) => {
  if (!request.auth)
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");

  const uid = request.auth.uid;
  const communityId = String((request.data as any)?.communityId ?? "").trim();
  if (!communityId)
    throw new functions.https.HttpsError("invalid-argument", "communityId is required.");

  const communityRef = db.collection("communities").doc(communityId);
  const communitySnap = await communityRef.get();
  if (!communitySnap.exists)
    throw new functions.https.HttpsError("not-found", "Community not found.");

  const community = communitySnap.data() as any;
  if (community.owner_id !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the owner can delete this community.",
    );
  }

  await Promise.allSettled([
    deleteByQuery("posts", "community_id", communityId),
    deleteByQuery("comments", "community_id", communityId),
    deleteByQuery("community_members", "community_id", communityId),
    deleteByQuery("community_moderators", "community_id", communityId),
    deleteByQuery("community_rules", "community_id", communityId),
    deleteByQuery("notifications", "community_id", communityId),
  ]);

  await communityRef.delete();
  return { success: true };
});