// functions/src/index.ts — FIREBASE CLOUD FUNCTION ✅
// Replaces: supabase/functions/delete-account/index.ts
// Deploy with: firebase deploy --only functions

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

export const deleteAccount = functions.https.onCall(
  async (request: functions.https.CallableRequest) => {
    // Must be authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to delete your account.",
      );
    }

    const userId = request.auth.uid;

    try {
      // 1) Delete all user Firestore data in parallel
      const deleteOperations = await Promise.allSettled([
        // Profile
        db.collection("profiles").doc(userId).delete(),

        // Posts
        db
          .collection("posts")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Comments
        db
          .collection("comments")
          .where("author_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Stories
        db
          .collection("stories")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Community memberships
        db
          .collection("community_members")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Support reports
        db
          .collection("support_reports")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Conversation participants
        db
          .collection("conversation_participants")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),

        // Notifications
        db
          .collection("notifications")
          .where("user_id", "==", userId)
          .get()
          .then((snap) => {
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            return batch.commit();
          }),
      ]);

      // Log any failures but continue
      deleteOperations.forEach((result, i) => {
        if (result.status === "rejected") {
          console.error(`Delete operation ${i} failed:`, result.reason);
        }
      });

      // 2) Delete user's Storage files
      try {
        const bucket = storage.bucket();
        await bucket.deleteFiles({ prefix: `media/${userId}/` });
        await bucket.deleteFiles({ prefix: `stories/${userId}/` });
        await bucket.deleteFiles({ prefix: `thumbnails/${userId}/` });
        await bucket.deleteFiles({ prefix: `support-screenshots/${userId}/` });
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);
        // Non-fatal — continue with auth deletion
      }

      // 3) Delete the Firebase Auth user
      await admin.auth().deleteUser(userId);

      return { success: true, message: "Account deleted successfully" };
    } catch (error: any) {
      console.error("Error deleting account:", error);
      throw new functions.https.HttpsError(
        "internal",
        error?.message || "Failed to delete account",
      );
    }
  },
);
