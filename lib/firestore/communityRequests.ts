// lib/firestore/communityRequests.ts
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import firestore from "@react-native-firebase/firestore";
import { COL } from "./refs";

export type CommunityJoinRequest = {
  id: string;
  community_id: string;
  user_id: string;
  created_at?: FirebaseFirestoreTypes.Timestamp | null;
};

/* -------------------------------------------------------------------------- */
/* Get all pending requests                                                   */
/* -------------------------------------------------------------------------- */

export async function getCommunityJoinRequests(
  communityId: string,
): Promise<CommunityJoinRequest[]> {
  const snap = await firestore()
    .collection(COL.community_join_requests)
    .where("community_id", "==", communityId)
    .orderBy("created_at", "asc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as any),
  }));
}

/* -------------------------------------------------------------------------- */
/* Check if user already requested                                            */
/* -------------------------------------------------------------------------- */

export async function isJoinRequested(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const snap = await firestore()
    .collection(COL.community_join_requests)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  return !snap.empty;
}

/* -------------------------------------------------------------------------- */
/* Create request                                                             */
/* -------------------------------------------------------------------------- */

export async function createJoinRequest(communityId: string, userId: string) {
  const exists = await isJoinRequested(communityId, userId);

  if (exists) return;

  await firestore().collection(COL.community_join_requests).add({
    community_id: communityId,
    user_id: userId,
    created_at: firestore.FieldValue.serverTimestamp(),
  });
}

/* -------------------------------------------------------------------------- */
/* Cancel own request                                                         */
/* -------------------------------------------------------------------------- */

export async function cancelJoinRequest(communityId: string, userId: string) {
  const snap = await firestore()
    .collection(COL.community_join_requests)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/* Approve request                                                            */
/* -------------------------------------------------------------------------- */

export async function approveJoinRequest(communityId: string, userId: string) {
  const requestSnap = await firestore()
    .collection(COL.community_join_requests)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  requestSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  batch.set(firestore().collection(COL.community_members).doc(), {
    community_id: communityId,
    user_id: userId,
    role: "member",
    joined_at: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const communityRef = firestore().collection(COL.communities).doc(communityId);

  await firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(communityRef);

    if (!doc.exists) return;

    const count = (doc.data()?.member_count as number | undefined) ?? 0;

    transaction.update(communityRef, {
      member_count: count + 1,
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Decline request                                                            */
/* -------------------------------------------------------------------------- */

export async function declineJoinRequest(communityId: string, userId: string) {
  const snap = await firestore()
    .collection(COL.community_join_requests)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}
