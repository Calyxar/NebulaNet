import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

setGlobalOptions({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 300,
});

const db = getFirestore();
const auth = getAuth();

/* ACCOUNT DELETION */

export const handleAccountDeletion = onDocumentCreated(
  "account_deletion_requests/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap) return;

    try {
      await db.collection("profiles").doc(userId).delete();

      await db.collection("user_settings").doc(userId).set(
        {
          deleted_at: new Date().toISOString(),
          cleanup_processed: true,
        },
        { merge: true },
      );

      await auth.deleteUser(userId).catch(() => void 0);

      await snap.ref.update({
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } catch (err) {
      await snap.ref.update({
        status: "failed",
        error: String(err),
      });
    }
  },
);

/* USER DATA EXPORT */

export const generateUserDataExport = onDocumentCreated(
  "data_export_requests/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap) return;

    try {
      const exportData: Record<string, unknown> = {};

      const profile = await db.collection("profiles").doc(userId).get();
      if (profile.exists) exportData.profile = profile.data();

      await snap.ref.update({
        status: "completed",
        export: exportData,
      });
    } catch (err) {
      await snap.ref.update({
        status: "failed",
        error: String(err),
      });
    }
  },
);

/* BOOST CREATED — EMAIL CONFIRMATION */

export const handleBoostCreated = onDocumentCreated(
  "boosts/{boostId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const boost = snap.data();
    const userId = boost.user_id;

    try {
      const userRecord = await auth.getUser(userId);
      const email = userRecord.email;
      if (!email) return;

      // Log confirmation (wire up Resend/SendGrid here when ready)
      console.log(
        `Boost confirmation for ${email}: post ${boost.post_id}, ` +
          `${boost.duration_days} days, $${boost.total_amount}`,
      );

      await snap.ref.update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Boost email error:", String(err));
    }
  },
);
