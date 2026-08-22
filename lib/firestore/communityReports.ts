// lib/firestore/communityReports.ts

import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

export type CommunityReport = {
  id: string;
  community_id: string;

  reporter_id: string;

  reported_type: "post" | "comment" | "user";

  reported_id: string;

  reason: string;

  status: "pending" | "resolved" | "dismissed";

  created_at?: FirebaseFirestoreTypes.Timestamp | null;

  resolved_by?: string | null;

  resolved_at?: FirebaseFirestoreTypes.Timestamp | null;
};

/**
 * Create a report
 */
export async function createCommunityReport(
  communityId: string,
  reporterId: string,
  type: "post" | "comment" | "user",
  reportedId: string,
  reason: string,
) {
  await firestore().collection("community_reports").add({
    community_id: communityId,
    reporter_id: reporterId,
    reported_type: type,
    reported_id: reportedId,
    reason,
    status: "pending",
    created_at: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Get pending reports for moderators
 */
export async function getCommunityReports(
  communityId: string,
): Promise<CommunityReport[]> {
  const snap = await firestore()
    .collection("community_reports")
    .where("community_id", "==", communityId)
    .where("status", "==", "pending")
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<CommunityReport, "id">),
  }));
}

/**
 * Resolve a report
 */
export async function resolveCommunityReport(
  reportId: string,
  moderatorId: string,
) {
  await firestore().collection("community_reports").doc(reportId).update({
    status: "resolved",
    resolved_by: moderatorId,
    resolved_at: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Dismiss a report
 */
export async function dismissCommunityReport(
  reportId: string,
  moderatorId: string,
) {
  await firestore().collection("community_reports").doc(reportId).update({
    status: "dismissed",
    resolved_by: moderatorId,
    resolved_at: firestore.FieldValue.serverTimestamp(),
  });
}
