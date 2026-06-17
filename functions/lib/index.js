"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderatePostContent = exports.verifyParentalCode = exports.sendParentalVerificationEmail = exports.deleteCommunity = exports.handleBoostCreated = exports.generateUserDataExport = exports.handleAccountDeletion = exports.onFollowDeleted = exports.onFollowUpdated = exports.onFollowCreated = exports.sendPushNotification = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
const firestore_2 = require("firebase-functions/v2/firestore");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300,
});
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const resendApiKey = (0, params_1.defineSecret)("RESEND_API_KEY");
const googleCloudApiKey = (0, params_1.defineSecret)("GOOGLE_CLOUD_VISION_API_KEY");
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getNotificationTitle(type, senderName) {
    if (type === "follow")
        return senderName + " started following you";
    if (type === "follow_request")
        return senderName + " requested to follow you";
    if (type === "like")
        return senderName + " liked your post";
    if (type === "comment")
        return senderName + " commented on your post";
    if (type === "repost")
        return senderName + " reposted your post";
    if (type === "mention")
        return senderName + " mentioned you";
    if (type === "message")
        return senderName + " sent you a message";
    if (type === "story_like")
        return senderName + " liked your story";
    if (type === "story_comment")
        return senderName + " commented on your story";
    if (type === "community_invite")
        return senderName + " invited you to a community";
    if (type === "join_request")
        return senderName + " wants to join your community";
    return "New notification from NebulaNet";
}
function getNotificationBody(type, text) {
    if (text)
        return text.slice(0, 100);
    if (type === "follow")
        return "Tap to view their profile";
    if (type === "follow_request")
        return "Tap to review the request";
    if (type === "like")
        return "Tap to view your post";
    if (type === "comment")
        return "Tap to see the comment";
    if (type === "repost")
        return "Tap to see the repost";
    if (type === "mention")
        return "Tap to see where you were mentioned";
    if (type === "message")
        return "Tap to reply";
    if (type === "story_like")
        return "Tap to view your story";
    if (type === "story_comment")
        return "Tap to see the comment";
    if (type === "community_invite")
        return "Tap to join the community";
    if (type === "join_request")
        return "Tap to review the request";
    return "";
}
function buildParentalEmailHtml(childUsername, code) {
    return [
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0B0F1A; color: #fff; border-radius: 16px;">',
        '<div style="text-align: center; margin-bottom: 32px;">',
        '<h1 style="font-size: 28px; font-weight: 900; color: #fff; margin: 0;">NebulaNet</h1>',
        '<p style="color: #8892A4; margin-top: 8px;">Parental Approval Required</p>',
        "</div>",
        '<p style="color: #CBD5E1; line-height: 1.6;">Hi there,<br/><br/>',
        '<strong style="color: #fff;">' +
            childUsername +
            '</strong> is trying to create a NebulaNet account. Because they are under 13, your approval is required.</p>',
        '<div style="background: #121726; border: 1px solid #1E2A3A; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0;">',
        '<p style="color: #8892A4; font-size: 13px; margin: 0 0 12px 0;">YOUR VERIFICATION CODE</p>',
        '<div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #8A7CFA;">' +
            code +
            "</div>",
        '<p style="color: #8892A4; font-size: 12px; margin: 12px 0 0 0;">This code expires in 30 minutes</p>',
        "</div>",
        '<p style="color: #CBD5E1; line-height: 1.6;">Share this code with ' +
            childUsername +
            " to complete account setup.</p>",
        '<div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 16px; margin-top: 24px;">',
        '<p style="color: #FCA5A5; font-size: 13px; margin: 0;"><strong>Did not request this?</strong> Please ignore this email.</p>',
        "</div>",
        '<p style="color: #3D4E63; font-size: 12px; text-align: center; margin-top: 32px;">NebulaNet - nebulanet.space</p>',
        "</div>",
    ].join("\n");
}
// ✅ NEW: data export email HTML
/**
 * Build HTML for data export email.
 */
function buildDataExportEmailHtml(displayName, stats) {
    return ('<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0B0F1A; color: #fff; border-radius: 20px;">' +
        '<div style="text-align: center; margin-bottom: 32px;">' +
        '<h1 style="font-size: 26px; font-weight: 900; color: #fff; margin: 0 0 6px 0;">' +
        'NebulaNet</h1>' +
        '<p style="color: #8892A4; margin: 0; font-size: 14px;">Your Data Export</p>' +
        '</div>' +
        '<p style="color: #CBD5E1; line-height: 1.6; font-size: 15px;">' +
        'Hi <strong style="color: #fff;">' + displayName + '</strong>,<br/><br/>' +
        'Your NebulaNet data export is attached to this email as a JSON file.' +
        ' It contains your profile, posts, comments, and activity.' +
        '</p>' +
        '<div style="background: #121726; border: 1px solid #1E2A3A; ' +
        'border-radius: 16px; padding: 20px; margin: 24px 0;">' +
        '<p style="color: #8892A4; font-size: 12px; font-weight: 700; ' +
        'letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 14px 0;">' +
        'Export Summary</p>' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Posts</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.posts + '</td></tr>' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Comments</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.comments + '</td></tr>' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Liked Posts</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.likes + '</td></tr>' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Followers</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.followers + '</td></tr>' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Following</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.following + '</td></tr>' +
        '<tr><td style="color: #CBD5E1; padding: 6px 0; font-size: 14px;">' +
        'Communities</td><td style="color: #8A7CFA; font-weight: 700; ' +
        'text-align: right; font-size: 14px;">' + stats.communities + '</td></tr>' +
        '</table>' +
        '</div>' +
        '<div style="background: rgba(138,124,250,0.1); border: 1px solid ' +
        'rgba(138,124,250,0.3); border-radius: 12px; padding: 14px; ' +
        'margin-bottom: 24px;">' +
        '<p style="color: #C4B9FF; font-size: 13px; margin: 0; line-height: 1.5;">' +
        'Your full data is in the attached <strong>.json</strong> file. ' +
        'Open it with any text editor or JSON viewer.' +
        '</p>' +
        '</div>' +
        '<p style="color: #CBD5E1; font-size: 13px; line-height: 1.6;">' +
        'If you did not request this export, you can safely ignore this email. ' +
        'Your account has not been affected.' +
        '</p>' +
        '<p style="color: #3D4E63; font-size: 12px; text-align: center; ' +
        'margin-top: 28px;">' +
        'NebulaNet &middot; <a href="https://nebulanet.space" style="color: #8A7CFA; ' +
        'text-decoration: none;">nebulanet.space</a>' +
        '</p>' +
        '</div>');
}
// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
exports.sendPushNotification = (0, firestore_2.onDocumentCreated)("notifications/{notifId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const notif = snap.data();
    const type = notif.type;
    const receiverId = notif.receiver_id;
    const senderId = notif.sender_id ?? null;
    const text = notif.text ?? null;
    if (!receiverId)
        return;
    if (senderId && senderId === receiverId)
        return;
    try {
        const [profileSnap, settingsSnap] = await Promise.all([
            db.collection("profiles").doc(receiverId).get(),
            db.collection("user_settings").doc(receiverId).get(),
        ]);
        if (!profileSnap.exists)
            return;
        const profile = profileSnap.data();
        const fcmToken = profile?.fcm_token ?? null;
        if (!fcmToken) {
            console.log("No FCM token for", receiverId);
            return;
        }
        const userSettings = settingsSnap.exists
            ? settingsSnap.data()
            : null;
        const notifPrefs = userSettings?.notifications ?? {};
        const typeEnabled = (() => {
            if (type === "like")
                return notifPrefs.likes !== false;
            if (type === "comment")
                return notifPrefs.comments !== false;
            if (type === "follow" || type === "follow_request")
                return notifPrefs.follows !== false;
            if (type === "message")
                return notifPrefs.direct_messages !== false;
            if (type === "mention")
                return notifPrefs.mentions !== false;
            if (type === "repost")
                return notifPrefs.reposts !== false;
            if (type === "story_like" || type === "story_comment")
                return notifPrefs.likes !== false;
            return true;
        })();
        if (!typeEnabled) {
            console.log("Notification type", type, "disabled for", receiverId);
            return;
        }
        const soundPref = userSettings?.notification_sound ?? "default";
        const channelId = soundPref === "silent"
            ? "silent"
            : type === "message"
                ? "messages"
                : "default";
        let senderName = "Someone";
        if (senderId) {
            const senderSnap = await db.collection("profiles").doc(senderId).get();
            if (senderSnap.exists) {
                const s = senderSnap.data();
                senderName =
                    s?.full_name || s?.username || "Someone";
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
                    priority: "high",
                    defaultVibrateTimings: soundPref !== "silent",
                },
                priority: "high",
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
                entityId: notif.entity_id ?? "",
                entityType: notif.entity_type ?? "",
            },
        };
        const response = await (0, messaging_1.getMessaging)().send(message);
        console.log("FCM sent to", receiverId, "type=", type, "channel=", channelId, "sound=", soundPref, "msgId=", response);
    }
    catch (err) {
        console.error("sendPushNotification error:", String(err));
        if (err?.code === "messaging/registration-token-not-registered" ||
            err?.code === "messaging/invalid-registration-token") {
            await db
                .collection("profiles")
                .doc(receiverId)
                .update({ fcm_token: null });
            console.log("Cleared invalid FCM token for", receiverId);
        }
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW COUNTERS
// ─────────────────────────────────────────────────────────────────────────────
exports.onFollowCreated = (0, firestore_2.onDocumentCreated)("follows/{followId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data.status !== "accepted")
        return;
    const followerId = data.follower_id;
    const followingId = data.following_id;
    if (!followerId || !followingId)
        return;
    try {
        await Promise.all([
            db
                .collection("profiles")
                .doc(followerId)
                .update({ following_count: firestore_1.FieldValue.increment(1) }),
            db
                .collection("profiles")
                .doc(followingId)
                .update({ follower_count: firestore_1.FieldValue.increment(1) }),
        ]);
    }
    catch (err) {
        console.error("onFollowCreated error:", String(err));
    }
});
exports.onFollowUpdated = (0, firestore_2.onDocumentUpdated)("follows/{followId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const wasAccepted = before.status === "accepted";
    const isAccepted = after.status === "accepted";
    if (wasAccepted === isAccepted)
        return;
    const followerId = after.follower_id;
    const followingId = after.following_id;
    if (!followerId || !followingId)
        return;
    const delta = isAccepted ? 1 : -1;
    try {
        await Promise.all([
            db
                .collection("profiles")
                .doc(followerId)
                .update({ following_count: firestore_1.FieldValue.increment(delta) }),
            db
                .collection("profiles")
                .doc(followingId)
                .update({ follower_count: firestore_1.FieldValue.increment(delta) }),
        ]);
    }
    catch (err) {
        console.error("onFollowUpdated error:", String(err));
    }
});
exports.onFollowDeleted = (0, firestore_2.onDocumentDeleted)("follows/{followId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data.status !== "accepted")
        return;
    const followerId = data.follower_id;
    const followingId = data.following_id;
    if (!followerId || !followingId)
        return;
    try {
        await Promise.all([
            db
                .collection("profiles")
                .doc(followerId)
                .update({ following_count: firestore_1.FieldValue.increment(-1) }),
            db
                .collection("profiles")
                .doc(followingId)
                .update({ follower_count: firestore_1.FieldValue.increment(-1) }),
        ]);
    }
    catch (err) {
        console.error("onFollowDeleted error:", String(err));
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DELETION
// ─────────────────────────────────────────────────────────────────────────────
exports.handleAccountDeletion = (0, firestore_2.onDocumentCreated)("account_deletion_requests/{userId}", async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap)
        return;
    try {
        await db.collection("profiles").doc(userId).delete();
        await db
            .collection("user_settings")
            .doc(userId)
            .set({ deleted_at: new Date().toISOString(), cleanup_processed: true }, { merge: true });
        await auth.deleteUser(userId).catch(() => void 0);
        await snap.ref.update({
            status: "completed",
            completed_at: new Date().toISOString(),
        });
    }
    catch (err) {
        await snap.ref.update({ status: "failed", error: String(err) });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// DATA EXPORT — ✅ FIXED: now collects all data and emails it via Resend
// ─────────────────────────────────────────────────────────────────────────────
exports.generateUserDataExport = (0, firestore_2.onDocumentCreated)({ document: "data_export_requests/{userId}", secrets: [resendApiKey] }, async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap)
        return;
    const requestData = snap.data();
    const requestedEmail = requestData.email;
    try {
        await snap.ref.update({ status: "processing" });
        // 1. Collect all user data in parallel
        const [profileSnap, postsSnap, commentsSnap, likesSnap, savesSnap, repostsSnap, followersSnap, followingSnap, notificationsSnap, settingsSnap, communitiesSnap,] = await Promise.all([
            db.collection("profiles").doc(userId).get(),
            db.collection("posts").where("user_id", "==", userId).limit(500).get(),
            db
                .collection("comments")
                .where("user_id", "==", userId)
                .limit(500)
                .get(),
            db.collection("likes").where("user_id", "==", userId).limit(1000).get(),
            db.collection("saves").where("user_id", "==", userId).limit(500).get(),
            db
                .collection("reposts")
                .where("user_id", "==", userId)
                .limit(500)
                .get(),
            db
                .collection("follows")
                .where("following_id", "==", userId)
                .where("status", "==", "accepted")
                .limit(1000)
                .get(),
            db
                .collection("follows")
                .where("follower_id", "==", userId)
                .where("status", "==", "accepted")
                .limit(1000)
                .get(),
            db
                .collection("notifications")
                .where("receiver_id", "==", userId)
                .limit(200)
                .get(),
            db.collection("user_settings").doc(userId).get(),
            db
                .collection("community_members")
                .where("user_id", "==", userId)
                .limit(100)
                .get(),
        ]);
        // 2. Resolve email — prefer Auth record over request field
        let emailToSend = requestedEmail ?? "";
        try {
            const userRecord = await auth.getUser(userId);
            if (userRecord.email)
                emailToSend = userRecord.email;
        }
        catch { }
        if (!emailToSend) {
            await snap.ref.update({
                status: "failed",
                error: "No email address found for user.",
            });
            return;
        }
        // 3. Build export object
        const profile = profileSnap.exists ? profileSnap.data() : {};
        const exportData = {
            exported_at: new Date().toISOString(),
            profile,
            posts: postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            comments: commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            liked_post_ids: likesSnap.docs.map((d) => d.data().post_id),
            saved_post_ids: savesSnap.docs.map((d) => d.data().post_id),
            reposted_post_ids: repostsSnap.docs.map((d) => d.data().post_id),
            followers_count: followersSnap.size,
            following_count: followingSnap.size,
            community_ids: communitiesSnap.docs.map((d) => d.data().community_id),
            settings: settingsSnap.exists ? settingsSnap.data() : {},
            notifications_count: notificationsSnap.size,
        };
        const username = profile?.username ?? userId;
        const displayName = profile?.full_name || username;
        const exportJson = JSON.stringify(exportData, null, 2);
        const dateStr = new Date().toISOString().split("T")[0];
        // 4. Send email with JSON attachment via Resend
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
        const result = (await emailRes.json());
        if (!emailRes.ok) {
            console.error("Resend error:", result);
            await snap.ref.update({
                status: "failed",
                error: "Email send failed: " + JSON.stringify(result),
            });
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
    }
    catch (err) {
        console.error("generateUserDataExport error:", String(err));
        await snap.ref.update({ status: "failed", error: String(err) });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// BOOST
// ─────────────────────────────────────────────────────────────────────────────
exports.handleBoostCreated = (0, firestore_2.onDocumentCreated)("boosts/{boostId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const boost = snap.data();
    const userId = boost.user_id;
    try {
        const userRecord = await auth.getUser(userId);
        const email = userRecord.email;
        if (!email)
            return;
        console.log("Boost confirmation for", email, ": post", boost.post_id, boost.duration_days, "days $", boost.total_amount);
        await snap.ref.update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error("Boost email error:", String(err));
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY DELETION
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteCommunity = v2_1.https.onCall({ region: "us-central1" }, async (req) => {
    const { communityId } = req.data;
    const uid = req.auth?.uid;
    if (!uid)
        throw new Error("Permission denied. User must be authenticated.");
    if (!communityId)
        throw new Error("communityId is required.");
    const communityRef = db.collection("communities").doc(communityId);
    const communitySnap = await communityRef.get();
    if (!communitySnap.exists)
        throw new Error("Community not found.");
    const communityData = communitySnap.data();
    if (!communityData || communityData.owner_id !== uid) {
        throw new Error("Permission denied. User is not the owner.");
    }
    await communityRef.delete();
    return { success: true, message: "Community deleted successfully" };
});
// ─────────────────────────────────────────────────────────────────────────────
// PARENTAL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
exports.sendParentalVerificationEmail = v2_1.https.onCall({ region: "us-central1", secrets: [resendApiKey] }, async (req) => {
    const { parentEmail, childUserId, childUsername } = req.data;
    if (!parentEmail || !childUserId) {
        throw new v2_1.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db
        .collection("parental_verifications")
        .doc(childUserId)
        .set({
        parent_email: parentEmail,
        child_user_id: childUserId,
        child_username: childUsername ?? null,
        code,
        expires_at: expiresAt.toISOString(),
        expires_at_ts: firestore_1.FieldValue.serverTimestamp(),
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
    const result = (await emailResponse.json());
    if (!emailResponse.ok) {
        console.error("Resend error:", result);
        throw new v2_1.https.HttpsError("internal", "Failed to send email.");
    }
    console.log("Parental verification email sent to", parentEmail);
    return { success: true, message: "Verification code sent." };
});
exports.verifyParentalCode = v2_1.https.onCall({ region: "us-central1" }, async (req) => {
    const { childUserId, code } = req.data;
    if (!childUserId || !code) {
        throw new v2_1.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const docRef = db.collection("parental_verifications").doc(childUserId);
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new v2_1.https.HttpsError("not-found", "Verification request not found.");
    }
    const data = snap.data();
    const storedCode = data.code;
    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
        throw new v2_1.https.HttpsError("deadline-exceeded", "Verification code has expired.");
    }
    if (storedCode !== code) {
        throw new v2_1.https.HttpsError("unauthenticated", "Invalid verification code.");
    }
    await docRef.update({
        verified: true,
        verified_at: new Date().toISOString(),
    });
    await db.collection("profiles").doc(childUserId).update({
        parental_approved: true,
        parental_email: data.parent_email,
        updated_at: new Date().toISOString(),
        updated_at_ts: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────────────────────
exports.moderatePostContent = (0, firestore_2.onDocumentCreated)({ document: "posts/{postId}", secrets: [googleCloudApiKey] }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const post = snap.data();
    const postId = event.params.postId;
    if (post.is_nsfw === true)
        return;
    const content = (post.content ?? "") + " " + (post.title ?? "");
    const mediaUrls = post.media_urls ?? [];
    const userId = post.user_id;
    let shouldFlag = false;
    let flagReason = "";
    const EXPLICIT_WORDS = [
        "porn",
        "nude",
        "naked",
        "xxx",
        "nsfw",
        "onlyfans",
        "sex tape",
        "adult content",
        "explicit",
        "18+",
        "hentai",
        "lewd",
        "slutty",
        "horny",
        "masturbat",
        "genitals",
    ];
    const lower = content.toLowerCase();
    const textMatch = EXPLICIT_WORDS.find((w) => lower.includes(w));
    if (textMatch) {
        shouldFlag = true;
        flagReason = "explicit_text:" + textMatch;
    }
    if (!shouldFlag && mediaUrls.length > 0) {
        try {
            const imageUrl = mediaUrls.find((u) => !u.includes(".mp4") &&
                !u.includes(".mov") &&
                !u.includes(".m4v") &&
                !u.includes(".webm"));
            if (imageUrl) {
                const visionRes = await fetch("https://vision.googleapis.com/v1/images:annotate?key=" +
                    googleCloudApiKey.value(), {
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
                });
                const visionData = (await visionRes.json());
                const safeSearch = visionData?.responses?.[0]?.safeSearchAnnotation;
                if (safeSearch) {
                    const flagLevels = ["LIKELY", "VERY_LIKELY"];
                    if (flagLevels.includes(safeSearch.adult) ||
                        flagLevels.includes(safeSearch.violence) ||
                        flagLevels.includes(safeSearch.racy)) {
                        shouldFlag = true;
                        flagReason = [
                            flagLevels.includes(safeSearch.adult)
                                ? "adult:" + safeSearch.adult
                                : "",
                            flagLevels.includes(safeSearch.racy)
                                ? "racy:" + safeSearch.racy
                                : "",
                            flagLevels.includes(safeSearch.violence)
                                ? "violence:" + safeSearch.violence
                                : "",
                        ]
                            .filter(Boolean)
                            .join(",");
                    }
                }
            }
        }
        catch (err) {
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
            detected_at_ts: firestore_1.FieldValue.serverTimestamp(),
            action_taken: "nsfw_flagged",
            reviewed: false,
        });
        const violationsSnap = await db
            .collection("content_violations")
            .where("user_id", "==", userId)
            .get();
        if (violationsSnap.size >= 3) {
            await db.collection("profiles").doc(userId).update({
                content_violation_count: violationsSnap.size,
                flagged_for_review: true,
                updated_at: new Date().toISOString(),
                updated_at_ts: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        console.log("Post", postId, "auto-flagged NSFW:", flagReason);
    }
});
