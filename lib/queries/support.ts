// lib/queries/support.ts — FIRESTORE ✅

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { uploadSupportScreenshot } from "./supportUpload";

export async function submitSupportReport(params: {
  subject: string;
  details: string;
  screenshotUri?: string | null;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any)?.manifest?.version ??
    null;

  // 1) create report
  const createdRef = await db.collection("support_reports").add({
    user_id: user.uid,
    subject: params.subject.trim(),
    details: params.details.trim(),
    app_version: appVersion,
    platform: Platform.OS,
    device_name: Device.deviceName ?? null,
    os_version: Device.osVersion ?? null,
    screenshot_bucket: null,
    screenshot_path: null,
    status: "open",
    admin_note: null,
    created_at: firestore.FieldValue.serverTimestamp(),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  // 2) upload screenshot + update
  if (params.screenshotUri) {
    const uploaded = await uploadSupportScreenshot({
      uri: params.screenshotUri,
      userId: user.uid,
      reportId: createdRef.id,
    });

    await db.collection("support_reports").doc(createdRef.id).update({
      screenshot_bucket: uploaded.bucket,
      screenshot_path: uploaded.path,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });
  }

  return { id: createdRef.id };
}
