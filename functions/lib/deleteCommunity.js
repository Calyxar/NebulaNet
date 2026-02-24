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
exports.deleteCommunity = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
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
exports.deleteCommunity = functions.https.onCall(async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    const uid = request.auth.uid;
    const communityId = String((_b = (_a = request.data) === null || _a === void 0 ? void 0 : _a.communityId) !== null && _b !== void 0 ? _b : "").trim();
    if (!communityId)
        throw new functions.https.HttpsError("invalid-argument", "communityId is required.");
    const communityRef = db.collection("communities").doc(communityId);
    const communitySnap = await communityRef.get();
    if (!communitySnap.exists)
        throw new functions.https.HttpsError("not-found", "Community not found.");
    const community = communitySnap.data();
    if (community.owner_id !== uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the owner can delete this community.");
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
