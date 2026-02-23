// lib/queries/support.ts — FIRESTORE ✅

import { db } from "@/lib/firebase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Platform } from "react-native";
import { uploadSupportScreenshot } from "./supportUpload";

const auth = getAuth();

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
  const createdRef = await addDoc(collection(db, "support_reports"), {
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
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // 2) upload screenshot + update
  if (params.screenshotUri) {
    const uploaded = await uploadSupportScreenshot({
      uri: params.screenshotUri,
      userId: user.uid,
      reportId: createdRef.id,
    });

    await updateDoc(doc(db, "support_reports", createdRef.id), {
      screenshot_bucket: uploaded.bucket,
      screenshot_path: uploaded.path,
      updated_at: serverTimestamp(),
    });
  }

  return { id: createdRef.id };
}
