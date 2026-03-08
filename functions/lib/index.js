"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserDataExport = exports.handleAccountDeletion = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
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
/* ACCOUNT DELETION */
exports.handleAccountDeletion = (0, firestore_2.onDocumentCreated)("account_deletion_requests/{userId}", async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap)
        return;
    try {
        await db.collection("profiles").doc(userId).delete();
        await db.collection("user_settings").doc(userId).set({
            deleted_at: new Date().toISOString(),
            cleanup_processed: true,
        }, { merge: true });
        await auth.deleteUser(userId).catch(() => void 0);
        await snap.ref.update({
            status: "completed",
            completed_at: new Date().toISOString(),
        });
    }
    catch (err) {
        await snap.ref.update({
            status: "failed",
            error: String(err),
        });
    }
});
/* USER DATA EXPORT */
exports.generateUserDataExport = (0, firestore_2.onDocumentCreated)("data_export_requests/{userId}", async (event) => {
    const userId = event.params.userId;
    const snap = event.data;
    if (!snap)
        return;
    try {
        const exportData = {};
        const profile = await db.collection("profiles").doc(userId).get();
        if (profile.exists)
            exportData.profile = profile.data();
        await snap.ref.update({
            status: "completed",
            export: exportData,
        });
    }
    catch (err) {
        await snap.ref.update({
            status: "failed",
            error: String(err),
        });
    }
});
