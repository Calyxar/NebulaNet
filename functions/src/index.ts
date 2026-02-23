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


async function deleteCollectionByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<void> {
  const snapshot = await db
    .collection(collectionName)
    .where(field, "==", value)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export const deleteCommunity = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const communityId = (request.data as { communityId?: string } | undefined)
    ?.communityId;

  if (!communityId || typeof communityId !== "string") {
    throw new HttpsError("invalid-argument", "communityId is required.");
  }

  const communityRef = db.collection("communities").doc(communityId);
  const communitySnap = await communityRef.get();

  if (!communitySnap.exists) {
    throw new HttpsError("not-found", "Community not found.");
  }

  const ownerId = (communitySnap.data()?.owner_id as string | undefined) ?? null;
  if (!ownerId || ownerId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the owner can delete this community.");
  }

  const postsSnap = await db
    .collection("posts")
    .where("community_id", "==", communityId)
    .get();

  const bucket = storage.bucket();

  await Promise.allSettled(
    postsSnap.docs.map(async (postDoc) => {
      const postId = postDoc.id;
      const postData = postDoc.data() as { media_urls?: unknown };
      const mediaUrls = Array.isArray(postData.media_urls)
        ? postData.media_urls.filter((v): v is string => typeof v === "string")
        : [];

      await Promise.allSettled(
        mediaUrls.map(async (url) => {
          const marker = `/o/`;
          const idx = url.indexOf(marker);
          if (idx < 0) return;
          const encodedPath = url.slice(idx + marker.length).split("?")[0];
          const objectPath = decodeURIComponent(encodedPath);
          if (
            objectPath.startsWith("community/") ||
            objectPath.startsWith("media/") ||
            objectPath.startsWith(`posts/${communityId}/`)
          ) {
            await bucket.file(objectPath).delete({ ignoreNotFound: true });
          }
        }),
      );

      await deleteCollectionByField("comments", "post_id", postId);
    }),
  );

  await deleteCollectionByField("community_members", "community_id", communityId);
  await deleteCollectionByField("community_moderators", "community_id", communityId);
  await deleteCollectionByField("community_rules", "community_id", communityId);
  await deleteCollectionByField("posts", "community_id", communityId);

  await communityRef.delete();

  await Promise.allSettled([
    bucket.deleteFiles({ prefix: `community/${communityId}/` }),
    bucket.deleteFiles({ prefix: `posts/${communityId}/` }),
  ]);

  return { success: true, message: "Community deleted successfully." };
});
