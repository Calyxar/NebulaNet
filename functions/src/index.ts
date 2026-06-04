import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { https, setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

initializeApp();

setGlobalOptions({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 300,
});

const db = getFirestore();
const auth = getAuth();

// ✅ Resend API key secret
const resendApiKey = defineSecret("RESEND_API_KEY");

function getNotificationTitle(type: string, senderName: string): string {
  if (type === "follow") return senderName + " started following you";
  if (type === "follow_request") return senderName + " requested to follow you";
  if (type === "like") return senderName + " liked your post";
  if (type === "comment") return senderName + " commented on your post";
  if (type === "repost") return senderName + " reposted your post";
  if (type === "mention") return senderName + " mentioned you";
  if (type === "message") return senderName + " sent you a message";
  if (type === "story_like") return senderName + " liked your story";
  if (type === "story_comment") return senderName + " commented on your story";
  if (type === "community_invite") {
    return senderName + " invited you to a community";
  }
  if (type === "join_request") {
    return senderName + " wants to join your community";
  }
  return "New notification from NebulaNet";
}

function getNotificationBody(type: string, text?: string | null): string {
  if (text) return text.slice(0, 100);
  if (type === "follow") return "Tap to view their profile";
  if (type === "follow_request") return "Tap to review the request";
  if (type === "like") return "Tap to view your post";
  if (type === "comment") return "Tap to see the comment";
  if (type === "repost") return "Tap to see the repost";
  if (type === "mention") return "Tap to see where you were mentioned";
  if (type === "message") return "Tap to reply";
  if (type === "story_like") return "Tap to view your story";
  if (type === "story_comment") return "Tap to see the comment";
  if (type === "community_invite") return "Tap to join the community";
  if (type === "join_request") return "Tap to review the request";
  return "";
}

// ✅ HTML builder — keeps template literal out of function body
function buildParentalEmailHtml(childUsername: string, code: string): string {
  return [
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0B0F1A; color: #fff; border-radius: 16px;\">",
    '<div style="text-align: center; margin-bottom: 32px;">',
    '<h1 style="font-size: 28px; font-weight: 900; color: #fff; margin: 0;">NebulaNet</h1>',
    '<p style="color: #8892A4; margin-top: 8px;">Parental Approval Required</p>',
    "</div>",
    '<p style="color: #CBD5E1; line-height: 1.6;">',
    "Hi there,<br /><br />",
    '<strong style="color: #fff;">' +
      childUsername +
      "</strong> is trying to create a NebulaNet account and has listed you as their parent or guardian. Because they are under 13, your approval is required.",
    "</p>",
    '<div style="background: #121726; border: 1px solid #1E2A3A; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0;">',
    '<p style="color: #8892A4; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>',
    '<div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #8A7CFA;">' +
      code +
      "</div>",
    '<p style="color: #8892A4; font-size: 12px; margin: 12px 0 0 0;">This code expires in 30 minutes</p>',
    "</div>",
    '<p style="color: #CBD5E1; line-height: 1.6;">',
    "Share this code with " +
      childUsername +
      " to complete account setup. Their account will have safe content settings enabled automatically.",
    "</p>",
    '<div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 16px; margin-top: 24px;">',
    '<p style="color: #FCA5A5; font-size: 13px; margin: 0; line-height: 1.6;">',
    "<strong>Did not request this?</strong> If you did not initiate this request, please ignore this email. No account will be created without this code.",
    "</p>",
    "</div>",
    '<p style="color: #3D4E63; font-size: 12px; text-align: center; margin-top: 32px;">',
    'NebulaNet &middot; <a href="https://nebulanet.space" style="color: #8A7CFA;">nebulanet.space</a> &middot; <a href="https://nebulanet.space/privacy" style="color: #8A7CFA;">Privacy Policy</a>',
    "</p>",
    "</div>",
  ].join("\n");
}

export const sendPushNotification = onDocumentCreated(
  "notifications/{notifId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const notif = snap.data() as Record<string, unknown>;
    const type = notif.type as string;
    const receiverId = notif.receiver_id as string;
    const senderId = (notif.sender_id as string) ?? null;
    const text = (notif.text as string) ?? null;
    if (!receiverId) return;
    if (senderId && senderId === receiverId) return;
    try {
      const profileSnap = await db.collection("profiles").doc(receiverId).get();
      if (!profileSnap.exists) return;
      const profile = profileSnap.data() as Record<string, unknown>;
      const pushToken = (profile?.push_token as string) ?? null;
      if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) return;
      let senderName = "Someone";
      if (senderId) {
        const senderSnap = await db.collection("profiles").doc(senderId).get();
        if (senderSnap.exists) {
          const s = senderSnap.data() as Record<string, unknown>;
          senderName =
            (s?.full_name as string) || (s?.username as string) || "Someone";
        }
      }
      const payload = {
        to: pushToken,
        title: getNotificationTitle(type, senderName),
        body: getNotificationBody(type, text),
        sound: "notification.wav",
        badge: 1,
        priority: "high",
        data: {
          type,
          notifId: event.params.notifId,
          senderId,
          entityId: (notif.entity_id as string) ?? null,
          "entityType": (notif.entity_type as string) ?? null,
        },
      };
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as Record<string, unknown>;
      const resultData = result?.data as Record<string, unknown>;
      if (resultData?.status === "error") {
        console.error("Expo push error:", resultData.message);
        const details = resultData.details as Record<string, unknown>;
        if (details?.error === "DeviceNotRegistered") {
          await db
            .collection("profiles")
            .doc(receiverId)
            .update({ push_token: null });
        }
      } else {
        console.log("Push sent to", receiverId, "type=", type);
      }
    } catch (err) {
      console.error("sendPushNotification error:", String(err));
    }
  },
);

export const onFollowCreated = onDocumentCreated(
  "follows/{followId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as Record<string, unknown>;
    if (data.status !== "accepted") return;
    const followerId = data.follower_id as string;
    const followingId = data.following_id as string;
    if (!followerId || !followingId) return;
    try {
      await Promise.all([
        db
          .collection("profiles")
          .doc(followerId)
          .update({ following_count: FieldValue.increment(1) }),
        db
          .collection("profiles")
          .doc(followingId)
          .update({ follower_count: FieldValue.increment(1) }),
      ]);
    } catch (err) {
      console.error("onFollowCreated error:", String(err));
    }
  },
);

export const onFollowUpdated = onDocumentUpdated(
  "follows/{followId}",
  async (event) => {
    const before = event.data?.before.data() as Record<string, unknown>;
    const after = event.data?.after.data() as Record<string, unknown>;
    if (!before || !after) return;
    const wasAccepted = before.status === "accepted";
    const isAccepted = after.status === "accepted";
    if (wasAccepted === isAccepted) return;
    const followerId = after.follower_id as string;
    const followingId = after.following_id as string;
    if (!followerId || !followingId) return;
    const delta = isAccepted ? 1 : -1;
    try {
      await Promise.all([
        db
          .collection("profiles")
          .doc(followerId)
          .update({ following_count: FieldValue.increment(delta) }),
        db
          .collection("profiles")
          .doc(followingId)
          .update({ follower_count: FieldValue.increment(delta) }),
      ]);
    } catch (err) {
      console.error("onFollowUpdated error:", String(err));
    }
  },
);

export const onFollowDeleted = onDocumentDeleted(
  "follows/{followId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as Record<string, unknown>;
    if (data.status !== "accepted") return;
    const followerId = data.follower_id as string;
    const followingId = data.following_id as string;
    if (!followerId || !followingId) return;
    try {
      await Promise.all([
        db
          .collection("profiles")
          .doc(followerId)
          .update({ following_count: FieldValue.increment(-1) }),
        db
          .collection("profiles")
          .doc(followingId)
          .update({ follower_count: FieldValue.increment(-1) }),
      ]);
    } catch (err) {
      console.error("onFollowDeleted error:", String(err));
    }
  },
);

export const handleAccountDeletion = onDocumentCreated(
  "account_deletion_requests/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap) return;
    try {
      await db.collection("profiles").doc(userId).delete();
      await db
        .collection("user_settings")
        .doc(userId)
        .set(
          { deleted_at: new Date().toISOString(), cleanup_processed: true },
          { merge: true },
        );
      await auth.deleteUser(userId).catch(() => void 0);
      await snap.ref.update({
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } catch (err) {
      await snap.ref.update({ status: "failed", error: String(err) });
    }
  },
);

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
      await snap.ref.update({ status: "completed", export: exportData });
    } catch (err) {
      await snap.ref.update({ status: "failed", error: String(err) });
    }
  },
);

export const handleBoostCreated = onDocumentCreated(
  "boosts/{boostId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const boost = snap.data() as Record<string, unknown>;
    const userId = boost.user_id as string;
    try {
      const userRecord = await auth.getUser(userId);
      const email = userRecord.email;
      if (!email) return;
      console.log(
        "Boost confirmation for",
        email,
        ": post",
        boost.post_id,
        boost.duration_days,
        "days $",
        boost.total_amount,
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

export const deleteCommunity = https.onCall(
  { region: "us-central1" },
  async (req) => {
    const { communityId } = req.data;
    const uid = req.auth?.uid;
    if (!uid) throw new Error("Permission denied. User must be authenticated.");
    if (!communityId) throw new Error("communityId is required.");
    const communityRef = db.collection("communities").doc(communityId);
    const communitySnap = await communityRef.get();
    if (!communitySnap.exists) throw new Error("Community not found.");
    const communityData = communitySnap.data() as Record<string, unknown>;
    if (!communityData || communityData.owner_id !== uid) {
      throw new Error("Permission denied. User is not the owner.");
    }
    await communityRef.delete();
    return { success: true, message: "Community deleted successfully" };
  },
);

// ✅ Send parental verification email via Resend
export const sendParentalVerificationEmail = https.onCall(
  {
    region: "us-central1",
    secrets: [resendApiKey],
  },
  async (req) => {
    const { parentEmail, childUserId, childUsername } = req.data;
    if (!parentEmail || !childUserId) {
      throw new https.HttpsError(
        "invalid-argument",
        "Missing required fields.",
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db
      .collection("parental_verifications")
      .doc(childUserId)
      .set({
        parent_email: parentEmail,
        "child_user_id": childUserId,
        child_username: childUsername ?? null,
        code,
        expires_at: expiresAt.toISOString(),
        expires_at_ts: FieldValue.serverTimestamp(),
        verified: false,
        created_at: new Date().toISOString(),
      });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey.value(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NebulaNet <noreply@nebulanet.space>",
        to: [parentEmail],
        subject: "Parental Approval Required — NebulaNet",
        html: buildParentalEmailHtml(childUsername ?? "Your child", code),
      }),
    });

    const result = (await emailResponse.json()) as Record<string, unknown>;
    if (!emailResponse.ok) {
      console.error("Resend error:", result);
      throw new https.HttpsError("internal", "Failed to send email.");
    }

    console.log("Parental verification email sent to", parentEmail);
    return { success: true, message: "Verification code sent." };
  },
);

// ✅ Verify parental code
export const verifyParentalCode = https.onCall(
  { region: "us-central1" },
  async (req) => {
    const { childUserId, code } = req.data;
    if (!childUserId || !code) {
      throw new https.HttpsError(
        "invalid-argument",
        "Missing required fields.",
      );
    }

    const docRef = db.collection("parental_verifications").doc(childUserId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new https.HttpsError(
        "not-found",
        "Verification request not found.",
      );
    }

    const data = snap.data() as Record<string, unknown>;
    const storedCode = data.code as string;
    const expiresAt = new Date(data.expires_at as string);

    if (new Date() > expiresAt) {
      throw new https.HttpsError(
        "deadline-exceeded",
        "Verification code has expired.",
      );
    }

    if (storedCode !== code) {
      throw new https.HttpsError(
        "unauthenticated",
        "Invalid verification code.",
      );
    }

    await docRef.update({
      verified: true,
      verified_at: new Date().toISOString(),
    });

    await db.collection("profiles").doc(childUserId).update({
      parental_approved: true,
      parental_email: data.parent_email,
      updated_at: new Date().toISOString(),
      updated_at_ts: FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
);
