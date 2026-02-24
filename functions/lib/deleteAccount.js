"use strict";
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
exports.deleteAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
const storage = admin.storage();
async function deleteByQuery(collectionName, field, value) {
    const snap = await db
        .collection(collectionName)
        .where(field, "==", value)
        .get();
    if (snap.empty)
        return;
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
    if (ops > 0)
        await batch.commit();
}
exports.deleteAccount = functions.https.onCall(async (request) => {
    const context = request.auth;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
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
        }
        catch (_a) { }
        await admin.auth().deleteUser(userId);
        return { success: true };
    }
    catch (e) {
        throw new functions.https.HttpsError("internal", (e === null || e === void 0 ? void 0 : e.message) || "Failed to delete account");
    }
});
