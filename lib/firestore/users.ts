// lib/firestore/users.ts — ✅ FIXED: updateUserProfile fans out to posts
import { auth } from "@/lib/firebase";
import { UserProfile } from "@/types/user";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

export async function getUserProfile(
  identifier: string,
): Promise<UserProfile | null> {
  let doc: FirebaseFirestoreTypes.DocumentSnapshot;

  if (identifier.length === 28) {
    doc = await firestore().collection("profiles").doc(identifier).get();
  } else {
    const snap = await firestore()
      .collection("profiles")
      .where("username", "==", identifier)
      .limit(1)
      .get();
    if (snap.empty) return null;
    doc = snap.docs[0];
  }

  if (!doc.exists()) return null;

  const profile = { id: doc.id, ...(doc.data() as any) };
  const currentUser = auth.currentUser;
  if (!currentUser) return profile;

  const followStatus = await getFollowStatus(currentUser.uid, profile.id);
  return {
    ...profile,
    is_following: followStatus.is_following,
    is_followed_by: followStatus.is_followed_by,
    is_self: currentUser.uid === profile.id,
  };
}

// ✅ FIXED: fans out username/avatar/full_name changes to all owned posts
export async function updateUserProfile(
  updates: Partial<UserProfile>,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Update the profile doc
  await firestore()
    .collection("profiles")
    .doc(user.uid)
    .update({
      ...updates,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });

  // Build the post snapshot patch — only fields that changed
  const profileUpdates: Record<string, any> = {};
  if (updates.username !== undefined)
    profileUpdates["user.username"] = updates.username;
  if (updates.full_name !== undefined)
    profileUpdates["user.full_name"] = updates.full_name;
  if (updates.avatar_url !== undefined)
    profileUpdates["user.avatar_url"] = updates.avatar_url;

  if (Object.keys(profileUpdates).length === 0) return;

  // Fetch all posts owned by this user
  const postsSnap = await firestore()
    .collection("posts")
    .where("user_id", "==", user.uid)
    .get();

  if (postsSnap.empty) return;

  // Batch update in chunks of 500 (Firestore limit)
  const chunks: FirebaseFirestoreTypes.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < postsSnap.docs.length; i += 500) {
    chunks.push(postsSnap.docs.slice(i, i + 500));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const batch = firestore().batch();
      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          ...profileUpdates,
          updated_at_ts: firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }),
  );
}

export async function getFollowStatus(followerId: string, followingId: string) {
  const [r1, r2] = await Promise.all([
    firestore()
      .collection("follows")
      .where("follower_id", "==", followerId)
      .where("following_id", "==", followingId)
      .limit(1)
      .get(),
    firestore()
      .collection("follows")
      .where("follower_id", "==", followingId)
      .where("following_id", "==", followerId)
      .limit(1)
      .get(),
  ]);

  return {
    is_following: !r1.empty && r1.docs[0].data().status === "accepted",
    is_followed_by: !r2.empty && r2.docs[0].data().status === "accepted",
  };
}

export async function toggleFollow(followingId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (user.uid === followingId) throw new Error("Cannot follow yourself");

  const snap = await firestore()
    .collection("follows")
    .where("follower_id", "==", user.uid)
    .where("following_id", "==", followingId)
    .limit(1)
    .get();

  if (!snap.empty) {
    await snap.docs[0].ref.delete();
    return { following: false };
  }

  const targetSnap = await firestore()
    .collection("profiles")
    .doc(followingId)
    .get();
  const isPrivate = !!(targetSnap.data() as any)?.is_private;
  const status = isPrivate ? "pending" : "accepted";

  await firestore().collection("follows").add({
    follower_id: user.uid,
    following_id: followingId,
    status,
    created_at: firestore.FieldValue.serverTimestamp(),
  });

  await firestore()
    .collection("notifications")
    .add({
      type: isPrivate ? "follow_request" : "follow",
      sender_id: user.uid,
      receiver_id: followingId,
      is_read: false,
      created_at: new Date().toISOString(),
      created_at_ts: firestore.FieldValue.serverTimestamp(),
    });

  return { following: true, pending: isPrivate };
}

export async function getUserFollowers(userId: string) {
  const snap = await firestore()
    .collection("follows")
    .where("following_id", "==", userId)
    .where("status", "==", "accepted")
    .orderBy("created_at", "desc")
    .get();
  const userIds = snap.docs.map((d) => d.data().follower_id);
  return getUsersByIds(userIds);
}

export async function getUserFollowing(userId: string) {
  const snap = await firestore()
    .collection("follows")
    .where("follower_id", "==", userId)
    .where("status", "==", "accepted")
    .orderBy("created_at", "desc")
    .get();
  const userIds = snap.docs.map((d) => d.data().following_id);
  return getUsersByIds(userIds);
}

export async function searchUsers(text: string) {
  const searchLower = text.toLowerCase().trim();
  if (searchLower.length < 2) return [];

  const snap = await firestore().collection("profiles").limit(50).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter(
      (u) =>
        u.username?.toLowerCase().includes(searchLower) ||
        u.full_name?.toLowerCase().includes(searchLower),
    );
}

export async function getUsersByIds(ids: string[]): Promise<UserProfile[]> {
  if (!ids.length) return [];
  const results: UserProfile[] = [];

  await Promise.all(
    ids.map(async (id) => {
      const snap = await firestore().collection("profiles").doc(id).get();
      if (snap.exists()) {
        results.push({ id, ...(snap.data() as any) } as UserProfile);
      }
    }),
  );

  return results;
}

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile) => void,
) {
  return firestore()
    .collection("profiles")
    .doc(userId)
    .onSnapshot((snap) => {
      if (!snap || !snap.exists()) return;
      callback({ id: snap.id, ...(snap.data() as any) } as UserProfile);
    });
}
