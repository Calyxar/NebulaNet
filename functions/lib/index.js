"use strict";
// functions/src/index.ts — PRODUCTION DELETE ACCOUNT ✅
// Deploy with: firebase deploy --only functions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommunity = exports.deleteAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
/* =========================================================
   Helper: Safe batched delete by query
   Handles large collections safely (<500 writes per batch)
========================================================= */
async function deleteByQuery(collection, field, value) {
    const snapshot = await db
        .collection(collection)
        .where(field, "==", value)
        .get();
    if (snapshot.empty)
        return;
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
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to delete your account.");
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
        }
        catch (storageError) {
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
    }
    catch (error) {
        console.error("Delete account failure:", error);
        throw new https_1.HttpsError("internal", (error === null || error === void 0 ? void 0 : error.message) || "Failed to delete account");
    }
});
async function deleteCollectionByField(collectionName, field, value) {
    const snapshot = await db
        .collection(collectionName)
        .where(field, "==", value)
        .get();
    if (snapshot.empty)
        return;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}
exports.deleteCommunity = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const communityId = (_a = request.data) === null || _a === void 0 ? void 0 : _a.communityId;
    if (!communityId || typeof communityId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "communityId is required.");
    }
    const communityRef = db.collection("communities").doc(communityId);
    const communitySnap = await communityRef.get();
    if (!communitySnap.exists) {
        throw new https_1.HttpsError("not-found", "Community not found.");
    }
    const ownerId = (_c = (_b = communitySnap.data()) === null || _b === void 0 ? void 0 : _b.owner_id) !== null && _c !== void 0 ? _c : null;
    if (!ownerId || ownerId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only the owner can delete this community.");
    }
    const postsSnap = await db
        .collection("posts")
        .where("community_id", "==", communityId)
        .get();
    const bucket = storage.bucket();
    await Promise.allSettled(postsSnap.docs.map(async (postDoc) => {
        const postId = postDoc.id;
        const postData = postDoc.data();
        const mediaUrls = Array.isArray(postData.media_urls)
            ? postData.media_urls.filter((v) => typeof v === "string")
            : [];
        await Promise.allSettled(mediaUrls.map(async (url) => {
            const marker = `/o/`;
            const idx = url.indexOf(marker);
            if (idx < 0)
                return;
            const encodedPath = url.slice(idx + marker.length).split("?")[0];
            const objectPath = decodeURIComponent(encodedPath);
            if (objectPath.startsWith("community/") ||
                objectPath.startsWith("media/") ||
                objectPath.startsWith(`posts/${communityId}/`)) {
                await bucket.file(objectPath).delete({ ignoreNotFound: true });
            }
        }));
        await deleteCollectionByField("comments", "post_id", postId);
    }));
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
