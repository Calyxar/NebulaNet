//lib/firestore/communityModerators.ts

import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import firestore from "@react-native-firebase/firestore";
import { createNotification } from "./notifications";
import { COL } from "./refs";

export type CommunityModerator = {
  id: string;
  community_id: string;
  user_id: string;
  added_at?: FirebaseFirestoreTypes.Timestamp | null;
};

export type CommunityMember = {
  id: string;
  community_id: string;
  user_id: string;
  joined_at?: FirebaseFirestoreTypes.Timestamp | null;
};

export async function getCommunityModerators(
  communityId: string,
): Promise<CommunityModerator[]> {
  const snap = await firestore()
    .collection(COL.community_moderators)
    .where("community_id", "==", communityId)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as any),
  }));
}

export async function getCommunityMembers(
  communityId: string,
): Promise<CommunityMember[]> {
  const snap = await firestore()
    .collection(COL.community_members)
    .where("community_id", "==", communityId)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as any),
  }));
}

export async function isModerator(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const snap = await firestore()
    .collection(COL.community_moderators)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  return !snap.empty;
}

export async function promoteToModerator(communityId: string, userId: string) {
  const alreadyModerator = await isModerator(communityId, userId);
  const owner = await isOwner(communityId, userId);
  if (owner) return;

  if (alreadyModerator) return;

  await firestore().collection(COL.community_moderators).add({
    community_id: communityId,
    user_id: userId,
    added_at: firestore.FieldValue.serverTimestamp(),
  });
  await createNotification({
    type: "system",
    receiver_id: userId,
    entity_type: "community",
    entity_id: communityId,
    text: "You were promoted to moderator.",
  });
}

export async function removeModerator(communityId: string, userId: string) {
  const snap = await firestore()
    .collection(COL.community_moderators)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  const batch = firestore().batch();

  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

export async function kickMember(communityId: string, userId: string) {
  const memberSnap = await firestore()
    .collection(COL.community_members)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();
  if (await isOwner(communityId, userId)) {
    throw new Error("Cannot remove the community owner.");
  }
  await createNotification({
    type: "system",
    receiver_id: userId,
    entity_type: "community",
    entity_id: communityId,
    text: "You were removed from the community.",
  });
  const batch = firestore().batch();

  memberSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const moderatorSnap = await firestore()
    .collection(COL.community_moderators)
    .where("community_id", "==", communityId)
    .where("user_id", "==", userId)
    .get();

  moderatorSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  await createNotification({
    type: "system",
    receiver_id: userId,
    entity_type: "community",
    entity_id: communityId,
    text: "Your moderator permissions were removed.",
  });

  const communityRef = firestore().collection(COL.communities).doc(communityId);

  await firestore().runTransaction(async (transaction) => {
    const communityDoc = await transaction.get(communityRef);

    if (!communityDoc.exists) return;

    const current =
      (communityDoc.data()?.member_count as number | undefined) ?? 0;

    transaction.update(communityRef, {
      member_count: Math.max(0, current - 1),
    });
  });
}

export async function isOwner(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const doc = await firestore()
    .collection(COL.communities)
    .doc(communityId)
    .get();

  if (!doc.exists) return false;

  return doc.data()?.owner_id === userId;
}
