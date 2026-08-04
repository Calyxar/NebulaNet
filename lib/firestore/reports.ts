// lib/firestore/reports.ts

import firestore from "@react-native-firebase/firestore";

export type ReportType = "user" | "post" | "comment" | "community";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "fake_account"
  | "violence"
  | "sexual_content"
  | "other";

type CreateReportInput = {
  reporter_id: string;
  reported_id: string;
  type: ReportType;
  reason: ReportReason;
  description?: string;
};

export async function createReport({
  reporter_id,
  reported_id,
  type,
  reason,
  description = "",
}: CreateReportInput) {
  if (!reporter_id || !reported_id) {
    throw new Error("Missing report IDs");
  }

  const existing = await firestore()
    .collection("reports")
    .where("reporter_id", "==", reporter_id)
    .where("reported_id", "==", reported_id)
    .where("type", "==", type)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("You have already reported this.");
  }

  const reportRef = await firestore().collection("reports").add({
    reporter_id,
    reported_id,
    type,
    reason,
    description,

    status: "pending",

    created_at: firestore.FieldValue.serverTimestamp(),
  });

  return reportRef.id;
}
