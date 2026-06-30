import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import { https, setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { algoliasearch } from "algoliasearch";
import { defineSecret as defineAlgoliaSecret } from "firebase-functions/params";

initializeApp();

setGlobalOptions({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 300,
});

const db = getFirestore();
const auth = getAuth();
const rtdb = getDatabase();

const resendApiKey = defineSecret("RESEND_API_KEY");
const googleCloudApiKey = defineSecret("GOOGLE_CLOUD_VISION_API_KEY");
const algoliaAdminKey = defineAlgoliaSecret("ALGOLIA_ADMIN_KEY");
const currentsApiKey = defineSecret("CURRENTS_API_KEY");

const ALGOLIA_APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID ?? "";

const MAX_BATCH_SIZE = 450;

const STORAGE_FOLDERS = [
  "community",
  "posts",
  "stories",
  "avatars",
  "chat",
  "thumbnails",
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
  if (type === "community_invite") return senderName + " invited you to a community";
  if (type === "join_request") return senderName + " wants to join your community";
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

function buildParentalEmailHtml(childUsername: string, code: string): string {
  return [
    "<div style=\"font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0B0F1A; color: #fff; border-radius: 16px;\">",
    "<div style=\"text-align: center; margin-bottom: 32px;\">",
    "<h1 style=\"font-size: 28px; font-weight: 900; color: #fff; margin: 0;\">NebulaNet</h1>",
    "<p style=\"color: #8892A4; margin-top: 8px;\">Parental Approval Required</p>",
    "</div>",
    "<p style=\"color: #CBD5E1; line-height: 1.6;\">Hi there,<br/><br/>",
    "<strong style=\"color: #fff;\">" + childUsername + "</strong> is trying to create a NebulaNet account. Because they are under 13, your approval is required.</p>",
    "<div style=\"background: #121726; border: 1px solid #1E2A3A; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0;\">",
    "<p style=\"color: #8892A4; font-size: 13px; margin: 0 0 12px 0;\">YOUR VERIFICATION CODE</p>",
    "<div style=\"font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #8A7CFA;\">" + code + "</div>",
    "<p style=\"color: #8892A4; font-size: 12px; margin: 12px 0 0 0;\">This code expires in 30 minutes</p>",
    "</div>",
    "<p style=\"color: #CBD5E1; line-height: 1.6;\">Share this code with " + childUsername + " to complete account setup.</p>",
    "<div style=\"background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 16px; margin-top: 24px;\">",
    "<p style=\"color: #FCA5A5; font-size: 13px; margin: 0;\"><strong>Did not request this?</strong> Please ignore this email.</p>",
    "</div>",
    "<p style=\"color: #3D4E63; font-size: 12px; text-align: center; margin-top: 32px;\">NebulaNet - nebulanet.space</p>",
    "</div>",
  ].join("\n");
}

function buildDataExportEmailHtml(
  displayName: string,
  stats: {
    posts: number;
    comments: number;
    likes: number;
    followers: number;
    following: number;
    communities: number;
  },
): string {
  return (
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0B0F1A; color: #fff; border-radius: 20px;\">" +
    "<div style=\"text-align: center; margin-bottom: 32px;\">" +
    "<h1 style=\"font-size: 26px; font-weight: 900; color: #fff; margin: 0 0 6px 0;\">NebulaNet</h1>" +
    "<p style=\"color: #8892A4; margin: 0; font-size: 14px;\">Your Data Export</p>" +
    "</div>" +
    "<p style=\"color: #CBD5E1; line-height: 1.6; font-size: 15px;\">Hi <strong style=\"color: #fff;\">" + displayName + "</strong>,<br/><br/>Your NebulaNet data export is attached to this email as a JSON file. It contains your profile, posts, comments, and activity.</p>" +
    "<div style=\"background: #121726; border: 1px solid #1E2A3A; border-radius: 16px; padding: 20px; margin: 24px 0;\">" +
    "<p style=\"color: #8892A4; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 14px 0;\">Export Summary</p>" +
    "<table style=\"width: 100%; border-collapse: collapse;\">" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Posts</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.posts + "</td></tr>" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Comments</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.comments + "</td></tr>" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Liked Posts</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.likes + "</td></tr>" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Followers</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.followers + "</td></tr>" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Following</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.following + "</td></tr>" +
    "<tr><td style=\"color: #CBD5E1; padding: 6px 0; font-size: 14px;\">Communities</td><td style=\"color: #8A7CFA; font-weight: 700; text-align: right; font-size: 14px;\">" + stats.communities + "</td></tr>" +
    "</table></div>" +
    "<div style=\"background: rgba(138,124,250,0.1); border: 1px solid rgba(138,124,250,0.3); border-radius: 12px; padding: 14px; margin-bottom: 24px;\">" +
    "<p style=\"color: #C4B9FF; font-size: 13px; margin: 0; line-height: 1.5;\">Your full data is in the attached <strong>.json</strong> file. Open it with any text editor or JSON viewer.</p>" +
    "</div>" +
    "<p style=\"color: #CBD5E1; font-size: 13px; line-height: 1.6;\">If you did not request this export, you can safely ignore this email. Your account has not been affected.</p>" +
    "<p style=\"color: #3D4E63; font-size: 12px; text-align: center; margin-top: 28px;\">NebulaNet &middot; <a href=\"https://nebulanet.space\" style=\"color: #8A7CFA; text-decoration: none;\">nebulanet.space</a></p>" +
    "</div>"
  );
}

async function deleteQueryInBatches(
  query: FirebaseFirestore.Query,
): Promise<number> {
  let totalDeleted = 0;
  while (true) {
    const snap = await query.limit(MAX_BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snap.size;
    if (snap.size < MAX_BATCH_SIZE) break;
  }
  return totalDeleted;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  try {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix });
    if (!files.length) return 0;
    await Promise.all(files.map((f) => f.delete().catch(() => void 0)));
    return files.length;
  } catch (err) {
    console.warn("deleteStoragePrefix failed for", prefix, String(err));
    return 0;
  }
}

function getAlgoliaClient() {
  return algoliasearch(ALGOLIA_APP_ID, algoliaAdminKey.value());
}

function changed(before: any, after: any, fields: string[]): boolean {
  return fields.some((f) => before?.[f] !== after?.[f]);
}

const POST_SEARCH_FIELDS = ["content", "title", "hashtags", "visibility", "is_nsfw", "is_visible", "community_id", "media_urls"];
const PROFILE_SEARCH_FIELDS = ["username", "full_name", "bio", "avatar_url", "is_private", "is_suspended"];
const COMMUNITY_SEARCH_FIELDS = ["name", "slug", "description", "is_private"];

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

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
      const [profileSnap, settingsSnap] = await Promise.all([
        db.collection("profiles").doc(receiverId).get(),
        db.collection("user_settings").doc(receiverId).get(),
      ]);
      if (!profileSnap.exists) return;
      const profile = profileSnap.data() as Record<string, unknown>;
      const fcmToken = (profile?.fcm_token as string) ?? null;
      if (!fcmToken) {
        console.log("No FCM token for", receiverId);
        return;
      }
      const userSettings = settingsSnap.exists
        ? (settingsSnap.data() as Record<string, unknown>)
        : null;
      const notifPrefs = (userSettings?.notifications as Record<string, unknown>) ?? {};
      const typeEnabled = (() => {
        if (type === "like") return notifPrefs.likes !== false;
        if (type === "comment") return notifPrefs.comments !== false;
        if (type === "follow" || type === "follow_request") return notifPrefs.follows !== false;
        if (type === "message") return notifPrefs.direct_messages !== false;
        if (type === "mention") return notifPrefs.mentions !== false;
        if (type === "repost") return notifPrefs.reposts !== false;
        if (type === "story_like" || type === "story_comment") return notifPrefs.likes !== false;
        return true;
      })();
      if (!typeEnabled) {
        console.log("Notification type", type, "disabled for", receiverId);
        return;
      }
      const soundPref = (userSettings?.notification_sound as string) ?? "default";
      const channelId =
        soundPref === "silent"
          ? "silent_v2"
          : soundPref === "vibrate"
            ? "vibrate_v2"
            : type === "message"
              ? "messages_v2"
              : "default_v2";
      let senderName = "Someone";
      if (senderId) {
        const senderSnap = await db.collection("profiles").doc(senderId).get();
        if (senderSnap.exists) {
          const s = senderSnap.data() as Record<string, unknown>;
          senderName = (s?.full_name as string) || (s?.username as string) || "Someone";
        }
      }
      const title = getNotificationTitle(type, senderName);
      const body = getNotificationBody(type, text);
      const message = {
        token: fcmToken,
        notification: { title, body },
        android: {
          notification: {
            channelId,
            sound: soundPref === "silent" ? undefined : "default",
            priority: "high" as const,
            defaultVibrateTimings: soundPref !== "silent",
          },
          priority: "high" as const,
        },
        apns: {
          payload: {
            aps: {
              sound: soundPref === "silent" ? undefined : "default",
              badge: 1,
            },
          },
        },
        data: {
          type,
          notifId: event.params.notifId,
          senderId: senderId ?? "",
          entityId: (notif.entity_id as string) ?? "",
          entityType: (notif.entity_type as string) ?? "",
        },
      };
      const response = await getMessaging().send(message);
      console.log("FCM sent to", receiverId, "type=", type, "channel=", channelId, "sound=", soundPref, "msgId=", response);
    } catch (err: any) {
      console.error("sendPushNotification error:", String(err));
      if (
        err?.code === "messaging/registration-token-not-registered" ||
        err?.code === "messaging/invalid-registration-token"
      ) {
        await db.collection("profiles").doc(receiverId).update({ fcm_token: null });
        console.log("Cleared invalid FCM token for", receiverId);
      }
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW COUNTERS
// ─────────────────────────────────────────────────────────────────────────────

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
        db.collection("profiles").doc(followerId).update({ following_count: FieldValue.increment(1) }),
        db.collection("profiles").doc(followingId).update({ follower_count: FieldValue.increment(1) }),
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
        db.collection("profiles").doc(followerId).update({ following_count: FieldValue.increment(delta) }),
        db.collection("profiles").doc(followingId).update({ follower_count: FieldValue.increment(delta) }),
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
        db.collection("profiles").doc(followerId).update({ following_count: FieldValue.increment(-1) }),
        db.collection("profiles").doc(followingId).update({ follower_count: FieldValue.increment(-1) }),
      ]);
    } catch (err) {
      console.error("onFollowDeleted error:", String(err));
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DELETION
// ─────────────────────────────────────────────────────────────────────────────

export const handleAccountDeletion = onDocumentCreated(
  "account_deletion_requests/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap) return;
    const deletionSummary: Record<string, number> = {};
    try {
      const contentCollections: Array<{ name: string; field: string }> = [
        { name: "posts", field: "user_id" },
        { name: "comments", field: "user_id" },
        { name: "likes", field: "user_id" },
        { name: "saves", field: "user_id" },
        { name: "reposts", field: "user_id" },
        { name: "community_members", field: "user_id" },
      ];
      for (const { name, field } of contentCollections) {
        const count = await deleteQueryInBatches(
          db.collection(name).where(field, "==", userId),
        );
        deletionSummary[name] = count;
      }
      const followsAsFollower = await deleteQueryInBatches(
        db.collection("follows").where("follower_id", "==", userId),
      );
      const followsAsFollowing = await deleteQueryInBatches(
        db.collection("follows").where("following_id", "==", userId),
      );
      deletionSummary["follows_as_follower"] = followsAsFollower;
      deletionSummary["follows_as_following"] = followsAsFollowing;
      const notifsReceived = await deleteQueryInBatches(
        db.collection("notifications").where("receiver_id", "==", userId),
      );
      const notifsSent = await deleteQueryInBatches(
        db.collection("notifications").where("sender_id", "==", userId),
      );
      deletionSummary["notifications_received"] = notifsReceived;
      deletionSummary["notifications_sent"] = notifsSent;
      const violations = await deleteQueryInBatches(
        db.collection("content_violations").where("user_id", "==", userId),
      );
      deletionSummary["content_violations"] = violations;
      await db.collection("profiles").doc(userId).delete();
      await db.collection("user_settings").doc(userId).delete();
      await auth.deleteUser(userId).catch(() => void 0);
      await rtdb.ref(`/status/${userId}`).remove().catch((err: any) => {
        console.warn("Failed to clean up RTDB presence node for", userId, String(err));
      });
      let storageFilesDeleted = 0;
      for (const folder of STORAGE_FOLDERS) {
        const count = await deleteStoragePrefix(`${folder}/${userId}/`);
        storageFilesDeleted += count;
      }
      deletionSummary["storage_files"] = storageFilesDeleted;
      await snap.ref.update({
        status: "completed",
        completed_at: new Date().toISOString(),
        deletion_summary: deletionSummary,
      });
      console.log("Account deletion completed for", userId, "summary:", deletionSummary);
    } catch (err) {
      await snap.ref.update({
        status: "failed",
        error: String(err),
        partial_deletion_summary: deletionSummary,
      });
      console.error("handleAccountDeletion error for", userId, String(err));
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// DATA EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const generateUserDataExport = onDocumentCreated(
  { document: "data_export_requests/{userId}", secrets: [resendApiKey] },
  async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap) return;
    const requestData = snap.data() as Record<string, unknown>;
    const requestedEmail = requestData.email as string | undefined;
    try {
      await snap.ref.update({ status: "processing" });
      const [
        profileSnap,
        postsSnap,
        commentsSnap,
        likesSnap,
        savesSnap,
        repostsSnap,
        followersSnap,
        followingSnap,
        notificationsSnap,
        settingsSnap,
        communitiesSnap,
      ] = await Promise.all([
        db.collection("profiles").doc(userId).get(),
        db.collection("posts").where("user_id", "==", userId).limit(500).get(),
        db.collection("comments").where("user_id", "==", userId).limit(500).get(),
        db.collection("likes").where("user_id", "==", userId).limit(1000).get(),
        db.collection("saves").where("user_id", "==", userId).limit(500).get(),
        db.collection("reposts").where("user_id", "==", userId).limit(500).get(),
        db.collection("follows").where("following_id", "==", userId).where("status", "==", "accepted").limit(1000).get(),
        db.collection("follows").where("follower_id", "==", userId).where("status", "==", "accepted").limit(1000).get(),
        db.collection("notifications").where("receiver_id", "==", userId).limit(200).get(),
        db.collection("user_settings").doc(userId).get(),
        db.collection("community_members").where("user_id", "==", userId).limit(100).get(),
      ]);
      let emailToSend = requestedEmail ?? "";
      try {
        const userRecord = await auth.getUser(userId);
        if (userRecord.email) emailToSend = userRecord.email;
      } catch {}
      if (!emailToSend) {
        await snap.ref.update({ status: "failed", error: "No email address found for user." });
        return;
      }
      const profile = profileSnap.exists ? profileSnap.data() : {};
      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        posts: postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        comments: commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        liked_post_ids: likesSnap.docs.map((d) => (d.data() as any).post_id),
        saved_post_ids: savesSnap.docs.map((d) => (d.data() as any).post_id),
        reposted_post_ids: repostsSnap.docs.map((d) => (d.data() as any).post_id),
        followers_count: followersSnap.size,
        following_count: followingSnap.size,
        community_ids: communitiesSnap.docs.map((d) => (d.data() as any).community_id),
        settings: settingsSnap.exists ? settingsSnap.data() : {},
        notifications_count: notificationsSnap.size,
      };
      const username = (profile as any)?.username ?? userId;
      const displayName = (profile as any)?.full_name || username;
      const exportJson = JSON.stringify(exportData, null, 2);
      const dateStr = new Date().toISOString().split("T")[0];
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + resendApiKey.value(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NebulaNet <noreply@nebulanet.space>",
          to: [emailToSend],
          subject: "Your NebulaNet Data Export",
          html: buildDataExportEmailHtml(displayName, {
            posts: exportData.posts.length,
            comments: exportData.comments.length,
            likes: exportData.liked_post_ids.length,
            followers: exportData.followers_count,
            following: exportData.following_count,
            communities: exportData.community_ids.length,
          }),
          attachments: [
            {
              filename: "nebulanet-data-" + username + "-" + dateStr + ".json",
              content: Buffer.from(exportJson).toString("base64"),
            },
          ],
        }),
      });
      const result = (await emailRes.json()) as Record<string, unknown>;
      if (!emailRes.ok) {
        console.error("Resend error:", result);
        await snap.ref.update({ status: "failed", error: "Email send failed: " + JSON.stringify(result) });
        return;
      }
      await snap.ref.update({
        status: "completed",
        completed_at: new Date().toISOString(),
        email_sent_to: emailToSend,
        resend_id: result.id ?? null,
        summary: {
          posts: exportData.posts.length,
          comments: exportData.comments.length,
          likes: exportData.liked_post_ids.length,
        },
      });
      console.log("Data export sent to", emailToSend, "for user", userId);
    } catch (err) {
      console.error("generateUserDataExport error:", String(err));
      await snap.ref.update({ status: "failed", error: String(err) });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// BOOST
// ─────────────────────────────────────────────────────────────────────────────

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
      console.log("Boost confirmation for", email, ": post", boost.post_id, boost.duration_days, "days $", boost.total_amount);
      await snap.ref.update({ email_sent: true, email_sent_at: new Date().toISOString() });
    } catch (err) {
      console.error("Boost email error:", String(err));
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY DELETION
// ─────────────────────────────────────────────────────────────────────────────

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
    if (!communityData || communityData.owner_id !== uid) throw new Error("Permission denied. User is not the owner.");
    await communityRef.delete();
    return { success: true, message: "Community deleted successfully" };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PARENTAL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const sendParentalVerificationEmail = https.onCall(
  { region: "us-central1", secrets: [resendApiKey] },
  async (req) => {
    const { parentEmail, childUserId, childUsername } = req.data;
    if (!parentEmail || !childUserId) {
      throw new https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.collection("parental_verifications").doc(childUserId).set({
      parent_email: parentEmail,
      child_user_id: childUserId,
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
        subject: "Parental Approval Required - NebulaNet",
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

export const verifyParentalCode = https.onCall(
  { region: "us-central1" },
  async (req) => {
    const { childUserId, code } = req.data;
    if (!childUserId || !code) {
      throw new https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const docRef = db.collection("parental_verifications").doc(childUserId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new https.HttpsError("not-found", "Verification request not found.");
    }
    const data = snap.data() as Record<string, unknown>;
    const storedCode = data.code as string;
    const expiresAt = new Date(data.expires_at as string);
    if (new Date() > expiresAt) {
      throw new https.HttpsError("deadline-exceeded", "Verification code has expired.");
    }
    if (storedCode !== code) {
      throw new https.HttpsError("unauthenticated", "Invalid verification code.");
    }
    await docRef.update({ verified: true, verified_at: new Date().toISOString() });
    await db.collection("profiles").doc(childUserId).update({
      parental_approved: true,
      parental_email: data.parent_email,
      updated_at: new Date().toISOString(),
      updated_at_ts: FieldValue.serverTimestamp(),
    });
    return { success: true };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────────────────────

export const moderatePostContent = onDocumentCreated(
  { document: "posts/{postId}", secrets: [googleCloudApiKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const post = snap.data() as Record<string, unknown>;
    const postId = event.params.postId;
    if (post.is_nsfw === true) return;
    const content = ((post.content as string) ?? "") + " " + ((post.title as string) ?? "");
    const mediaUrls = (post.media_urls as string[]) ?? [];
    const userId = post.user_id as string;
    let shouldFlag = false;
    let flagReason = "";
    const EXPLICIT_WORDS = [
      "porn", "nude", "naked", "xxx", "nsfw", "onlyfans", "sex tape",
      "adult content", "explicit", "18+", "hentai", "lewd", "slutty",
      "horny", "masturbat", "genitals",
    ];
    const lower = content.toLowerCase();
    const textMatch = EXPLICIT_WORDS.find((w) => lower.includes(w));
    if (textMatch) {
      shouldFlag = true;
      flagReason = "explicit_text:" + textMatch;
    }
    if (!shouldFlag && mediaUrls.length > 0) {
      try {
        const imageUrl = mediaUrls.find(
          (u) => !u.includes(".mp4") && !u.includes(".mov") && !u.includes(".m4v") && !u.includes(".webm"),
        );
        if (imageUrl) {
          const visionRes = await fetch(
            "https://vision.googleapis.com/v1/images:annotate?key=" + googleCloudApiKey.value(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [
                  {
                    image: { source: { imageUri: imageUrl } },
                    features: [{ type: "SAFE_SEARCH_DETECTION" }],
                  },
                ],
              }),
            },
          );
          const visionData = (await visionRes.json()) as any;
          const safeSearch = visionData?.responses?.[0]?.safeSearchAnnotation;
          if (safeSearch) {
            const flagLevels = ["LIKELY", "VERY_LIKELY"];
            if (
              flagLevels.includes(safeSearch.adult) ||
              flagLevels.includes(safeSearch.violence) ||
              flagLevels.includes(safeSearch.racy)
            ) {
              shouldFlag = true;
              flagReason = [
                flagLevels.includes(safeSearch.adult) ? "adult:" + safeSearch.adult : "",
                flagLevels.includes(safeSearch.racy) ? "racy:" + safeSearch.racy : "",
                flagLevels.includes(safeSearch.violence) ? "violence:" + safeSearch.violence : "",
              ].filter(Boolean).join(",");
            }
          }
        }
      } catch (err) {
        console.error("Vision API error:", String(err));
      }
    }
    if (shouldFlag) {
      await snap.ref.update({
        is_nsfw: true,
        nsfw_auto_detected: true,
        nsfw_flag_reason: flagReason,
        nsfw_detected_at: new Date().toISOString(),
      });
      await db.collection("content_violations").add({
        post_id: postId,
        user_id: userId,
        flag_reason: flagReason,
        content_preview: content.slice(0, 200),
        media_urls: mediaUrls,
        detected_at: new Date().toISOString(),
        detected_at_ts: FieldValue.serverTimestamp(),
        action_taken: "nsfw_flagged",
        reviewed: false,
      });
      const violationsSnap = await db.collection("content_violations").where("user_id", "==", userId).get();
      if (violationsSnap.size >= 3) {
        await db.collection("profiles").doc(userId).update({
          content_violation_count: violationsSnap.size,
          flagged_for_review: true,
          updated_at: new Date().toISOString(),
          updated_at_ts: FieldValue.serverTimestamp(),
        });
      }
      console.log("Post", postId, "auto-flagged NSFW:", flagReason);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// ALGOLIA SYNC (fixed for algoliasearch v5 — saveObject/deleteObject take
// { indexName, body/objectID } instead of the old client.initIndex(...) chain)
// ─────────────────────────────────────────────────────────────────────────────

export const syncPostToAlgolia = onDocumentCreated(
  { document: "posts/{postId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    try {
      const data = snap.data() as any;
      await getAlgoliaClient().saveObject({
        indexName: "posts",
        body: {
          objectID: event.params.postId,
          content: data.content ?? "",
          title: data.title ?? "",
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
          user_id: data.user_id ?? null,
          username: data.user?.username ?? null,
          full_name: data.user?.full_name ?? null,
          community_id: data.community_id ?? null,
          visibility: data.visibility ?? "public",
          is_nsfw: data.is_nsfw === true,
          is_visible: data.is_visible !== false,
          media_urls: Array.isArray(data.media_urls) ? data.media_urls : [],
          created_at_ts: data.created_at_ts?.toMillis?.() ?? Date.now(),
        },
      });
    } catch (err) {
      console.error("[syncPostToAlgolia] failed:", String(err));
    }
  },
);

export const syncPostUpdateToAlgolia = onDocumentUpdated(
  { document: "posts/{postId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    if (!before || !after) return;
    if (!changed(before, after, POST_SEARCH_FIELDS)) return;
    try {
      await getAlgoliaClient().saveObject({
        indexName: "posts",
        body: {
          objectID: event.params.postId,
          content: after.content ?? "",
          title: after.title ?? "",
          hashtags: Array.isArray(after.hashtags) ? after.hashtags : [],
          user_id: after.user_id ?? null,
          username: after.user?.username ?? null,
          full_name: after.user?.full_name ?? null,
          community_id: after.community_id ?? null,
          visibility: after.visibility ?? "public",
          is_nsfw: after.is_nsfw === true,
          is_visible: after.is_visible !== false,
          media_urls: Array.isArray(after.media_urls) ? after.media_urls : [],
          created_at_ts: after.created_at_ts?.toMillis?.() ?? Date.now(),
        },
      });
    } catch (err) {
      console.error("[syncPostUpdateToAlgolia] failed:", String(err));
    }
  },
);

export const removePostFromAlgolia = onDocumentDeleted(
  { document: "posts/{postId}", secrets: [algoliaAdminKey] },
  async (event) => {
    try {
      await getAlgoliaClient().deleteObject({
        indexName: "posts",
        objectID: event.params.postId,
      });
    } catch (err) {
      console.error("[removePostFromAlgolia] failed:", String(err));
    }
  },
);

export const syncProfileToAlgolia = onDocumentCreated(
  { document: "profiles/{userId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    try {
      const data = snap.data() as any;
      await getAlgoliaClient().saveObject({
        indexName: "profiles",
        body: {
          objectID: event.params.userId,
          username: data.username ?? "",
          full_name: data.full_name ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? null,
          follower_count: data.follower_count ?? 0,
          is_private: data.is_private === true,
          is_suspended: data.is_suspended === true,
        },
      });
    } catch (err) {
      console.error("[syncProfileToAlgolia] failed:", String(err));
    }
  },
);

export const syncProfileUpdateToAlgolia = onDocumentUpdated(
  { document: "profiles/{userId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    if (!before || !after) return;
    if (!changed(before, after, PROFILE_SEARCH_FIELDS)) return;
    try {
      await getAlgoliaClient().saveObject({
        indexName: "profiles",
        body: {
          objectID: event.params.userId,
          username: after.username ?? "",
          full_name: after.full_name ?? "",
          bio: after.bio ?? "",
          avatar_url: after.avatar_url ?? null,
          follower_count: after.follower_count ?? 0,
          is_private: after.is_private === true,
          is_suspended: after.is_suspended === true,
        },
      });
    } catch (err) {
      console.error("[syncProfileUpdateToAlgolia] failed:", String(err));
    }
  },
);

export const removeProfileFromAlgolia = onDocumentDeleted(
  { document: "profiles/{userId}", secrets: [algoliaAdminKey] },
  async (event) => {
    try {
      await getAlgoliaClient().deleteObject({
        indexName: "profiles",
        objectID: event.params.userId,
      });
    } catch (err) {
      console.error("[removeProfileFromAlgolia] failed:", String(err));
    }
  },
);

export const syncCommunityToAlgolia = onDocumentCreated(
  { document: "communities/{communityId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    try {
      const data = snap.data() as any;
      await getAlgoliaClient().saveObject({
        indexName: "communities",
        body: {
          objectID: event.params.communityId,
          name: data.name ?? "",
          slug: data.slug ?? "",
          description: data.description ?? "",
          member_count: data.member_count ?? 0,
          is_private: data.is_private === true,
        },
      });
    } catch (err) {
      console.error("[syncCommunityToAlgolia] failed:", String(err));
    }
  },
);

export const syncCommunityUpdateToAlgolia = onDocumentUpdated(
  { document: "communities/{communityId}", secrets: [algoliaAdminKey] },
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    if (!before || !after) return;
    if (!changed(before, after, COMMUNITY_SEARCH_FIELDS)) return;
    try {
      await getAlgoliaClient().saveObject({
        indexName: "communities",
        body: {
          objectID: event.params.communityId,
          name: after.name ?? "",
          slug: after.slug ?? "",
          description: after.description ?? "",
          member_count: after.member_count ?? 0,
          is_private: after.is_private === true,
        },
      });
    } catch (err) {
      console.error("[syncCommunityUpdateToAlgolia] failed:", String(err));
    }
  },
);

export const removeCommunityFromAlgolia = onDocumentDeleted(
  { document: "communities/{communityId}", secrets: [algoliaAdminKey] },
  async (event) => {
    try {
      await getAlgoliaClient().deleteObject({
        indexName: "communities",
        objectID: event.params.communityId,
      });
    } catch (err) {
      console.error("[removeCommunityFromAlgolia] failed:", String(err));
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// NEWS SYNC (Currents API → Firestore cache, read by the News tab)
// ─────────────────────────────────────────────────────────────────────────────

// V2 canonical categories — picked a representative spread rather than all 16
// to keep the daily request budget low on Currents' free tier (1,000/day).
const NEWS_CATEGORIES = [
  "general",
  "science_technology",
  "economy_business_finance",
  "sport",
  "arts_culture_entertainment",
  "health",
] as const;

type NewsArticle = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  author: string | null;
  image: string | null;
  language: string;
  category: string[];
  published: string;
};

async function fetchCurrentsCategory(
  category: string,
  apiKey: string,
): Promise<NewsArticle[]> {
  const url =
    "https://api.currentsapi.services/v2/latest-news" +
    "?language=en&page_size=20&category=" +
    encodeURIComponent(category) +
    "&apiKey=" +
    encodeURIComponent(apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(
      "[syncNews] Currents request failed for category",
      category,
      res.status,
      await res.text().catch(() => ""),
    );
    return [];
  }
  const data = (await res.json()) as { status: string; news?: NewsArticle[] };
  if (data.status !== "ok" || !Array.isArray(data.news)) {
    console.error("[syncNews] unexpected Currents response for", category, data);
    return [];
  }
  return data.news;
}

// Runs every 3 hours. Fetches each category from Currents and upserts into
// Firestore, deduped by article id so re-fetching the same story doesn't
// create duplicates. Also writes a small news_meta doc per category so the
// client can show "Updated Xh ago" without needing article-level timestamps.
export const syncNewsFromCurrents = onSchedule(
  { schedule: "every 3 hours", secrets: [currentsApiKey], timeoutSeconds: 300 },
  async () => {
    const apiKey = currentsApiKey.value();
    if (!apiKey) {
      console.error("[syncNews] CURRENTS_API_KEY secret is empty");
      return;
    }

    for (const category of NEWS_CATEGORIES) {
      try {
        const articles = await fetchCurrentsCategory(category, apiKey);
        if (!articles.length) {
          console.log("[syncNews] no articles returned for", category);
          continue;
        }

        const batch = db.batch();
        let count = 0;
        for (const a of articles) {
          if (!a.id) continue;
          const ref = db.collection("news_articles").doc(a.id);
          batch.set(
            ref,
            {
              title: a.title ?? "",
              description: a.description ?? null,
              url: a.url ?? "",
              author: a.author ?? null,
              image: a.image ?? null,
              language: a.language ?? "en",
              category: Array.isArray(a.category) ? a.category : [category],
              published: a.published ?? null,
              synced_at: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          count++;
        }
        if (count > 0) await batch.commit();

        await db.collection("news_meta").doc(category).set({
          last_synced_at: FieldValue.serverTimestamp(),
          article_count: count,
        });

        console.log("[syncNews] synced", count, "articles for", category);
      } catch (err) {
        console.error("[syncNews] failed for category", category, String(err));
      }
    }
  },
);
