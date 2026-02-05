import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { uploadSupportScreenshot } from "./supportUpload";

export async function submitSupportReport(params: {
  subject: string;
  details: string;
  screenshotUri?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any)?.manifest?.version ??
    null;

  // 1) Create report row first (no screenshot yet)
  const { data: created, error: createError } = await supabase
    .from("support_reports")
    .insert({
      user_id: user.id,
      subject: params.subject.trim(),
      details: params.details.trim(),
      app_version: appVersion,
      platform: Platform.OS,
      device_name: Device.deviceName ?? null,
      os_version: Device.osVersion ?? null,
      screenshot_bucket: null,
      screenshot_path: null,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  // 2) If screenshot provided, upload and update report
  if (params.screenshotUri) {
    const uploaded = await uploadSupportScreenshot({
      uri: params.screenshotUri,
      userId: user.id,
      reportId: created.id,
    });

    const { error: updateError } = await supabase
      .from("support_reports")
      .update({
        screenshot_bucket: uploaded.bucket,
        screenshot_path: uploaded.path,
      })
      .eq("id", created.id);

    if (updateError) throw updateError;
  }

  return created;
}
