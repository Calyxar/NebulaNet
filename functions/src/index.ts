import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
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

/**
 * Returns push notification title for a given notification type.
 * @param {string} type - The notification type.
 * @param {string} senderName - Display name of the sender.
 * @return {string} The notification title.
 */
function getNotificationTitle(type: string, senderName: string): string {
  if (type === "follow") return senderName + " started following you";
  if (type === "follow_request") return senderName + " requested to follow you";
  if (type === "like") return senderName + " liked your post";
  if (type === "comment") return senderName + " commented on your post";
  if (type === "repost") return senderName + " reposted your post";
  if (type === "mention") return senderName + " mentioned you";
  if (type === "message") return senderName + " sent you a message";
  if (type === "story_like") return senderName + " liked your story";
  if (type === "story_comment") {
    return senderName + " commented on your story";
  }
  if (type === "community_invite") {
    return senderName + " invited you to a community";
  }
  if (type === "join_request") {
    return senderName + " wants to join your community";
  }
  return "New notification from NebulaNet";
}

/**
 * Returns push notification body for a given notification type.
 * @param {string} type - The notification type.
 * @param {string|null|undefined} text - Optional preview text.
 * @return {string} The notification body.
 */
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

      if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
        return;
      }

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
          entityType: (notif.entity_type as string) ?? null,
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

/**
 * Increments follower/following counts when an accepted follow is created.
 */
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

/**
 * Adjusts counts when a follow's status changes (e.g. pending -> accepted
 * after approving a follow request). Only writes deltas when the accepted
 * state actually flips.
 */
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

/**
 * Decrements counts when an accepted follow is deleted. Pending follow
 * deletions are a no-op because pending follows never counted.
 */
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
    if (!uid) {
      throw new Error("Permission denied. User must be authenticated.");
    }
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

