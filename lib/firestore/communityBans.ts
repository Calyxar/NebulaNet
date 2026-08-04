// lib/firestore/communityBans.ts

import firestore, {
    FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

export type CommunityBan = {
  id: string;
  community_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at?: FirebaseFirestoreTypes.Timestamp | null;
};

/**
 * Ban a user from a community.
 * If they're already banned, nothing happens.
 */
export async function banUser(
  communityId: string,
  userId: string,
  bannedBy: string,
  reason?: string,
) {
  const existing = await firestore()
    .collection("community_bans")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  if (!existing.empty) return;

  // Remove from members (if present)
  const memberSnap = await firestore()
    .collection("community_members")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  memberSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Remove pending join requests
  const requestSnap = await firestore()
    .collection("community_join_requests")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  requestSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const banRef = firestore().collection("community_bans").doc();

  batch.set(banRef, {
    community_id: communityId,
    user_id: userId,
    banned_by: bannedBy,
    reason: reason ?? null,
    created_at: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Remove a ban.
 */
export async function unbanUser(communityId: string, userId: string) {
  const snap = await firestore()
    .collection("community_bans")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Returns true if user is banned.
 */
export async function isUserBanned(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const snap = await firestore()
    .collection("community_bans")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  return !snap.empty;
}

/**
 * Get one ban document.
 */
export async function getBan(
  communityId: string,
  userId: string,
): Promise<CommunityBan | null> {
  const snap = await firestore()
    .collection("community_bans")
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];

  return {
    id: doc.id,
    ...(doc.data() as Omit<CommunityBan, "id">),
  };
}

/**
 * Get every banned user in a community.
 */
export async function getCommunityBans(
  communityId: string,
): Promise<CommunityBan[]> {
  const snap = await firestore()
    .collection("community_bans")
    .where("community_id", "==", communityId)
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<CommunityBan, "id">),
  }));
}

/**
 * Convenience helper.
 */
export async function canJoinCommunity(
  communityId: string,
  userId: string,
): Promise<boolean> {
  return !(await isUserBanned(communityId, userId));
}
