// lib/firestore/communityAnnouncements.ts

import firestore, {
    FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

export type CommunityAnnouncement = {
  id: string;
  community_id: string;
  author_id: string;

  title: string;
  content: string;

  is_pinned: boolean;

  created_at?: FirebaseFirestoreTypes.Timestamp | null;
  updated_at?: FirebaseFirestoreTypes.Timestamp | null;
};

/**
 * Create a community announcement
 */
export async function createCommunityAnnouncement(
  communityId: string,
  authorId: string,
  title: string,
  content: string,
) {
  const ref = await firestore().collection("community_announcements").add({
    community_id: communityId,
    author_id: authorId,
    title: title.trim(),
    content: content.trim(),
    is_pinned: false,
    created_at: firestore.FieldValue.serverTimestamp(),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

/**
 * Get all announcements for a community
 */
export async function getCommunityAnnouncements(
  communityId: string,
): Promise<CommunityAnnouncement[]> {
  const snap = await firestore()
    .collection("community_announcements")
    .where("community_id", "==", communityId)
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<CommunityAnnouncement, "id">),
  }));
}

/**
 * Get the currently pinned announcement
 */
export async function getPinnedCommunityAnnouncement(
  communityId: string,
): Promise<CommunityAnnouncement | null> {
  const snap = await firestore()
    .collection("community_announcements")
    .where("community_id", "==", communityId)
    .where("is_pinned", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return null;
  }

  const doc = snap.docs[0];

  return {
    id: doc.id,
    ...(doc.data() as Omit<CommunityAnnouncement, "id">),
  };
}

/**
 * Pin an announcement
 *
 * Only one announcement should be pinned at a time.
 */
export async function pinCommunityAnnouncement(
  communityId: string,
  announcementId: string,
) {
  const db = firestore();

  const existingPinned = await db
    .collection("community_announcements")
    .where("community_id", "==", communityId)
    .where("is_pinned", "==", true)
    .get();

  const batch = db.batch();

  existingPinned.docs.forEach((doc) => {
    batch.update(doc.ref, {
      is_pinned: false,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });
  });

  batch.update(db.collection("community_announcements").doc(announcementId), {
    is_pinned: true,
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Unpin an announcement
 */
export async function unpinCommunityAnnouncement(announcementId: string) {
  await firestore()
    .collection("community_announcements")
    .doc(announcementId)
    .update({
      is_pinned: false,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Delete an announcement
 */
export async function deleteCommunityAnnouncement(announcementId: string) {
  await firestore()
    .collection("community_announcements")
    .doc(announcementId)
    .delete();
}

/**
 * Update an announcement
 */
export async function updateCommunityAnnouncement(
  announcementId: string,
  title: string,
  content: string,
) {
  await firestore()
    .collection("community_announcements")
    .doc(announcementId)
    .update({
      title: title.trim(),
      content: content.trim(),
      updated_at: firestore.FieldValue.serverTimestamp(),
    });
}
