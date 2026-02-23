// lib/firestore/users.ts — FIRESTORE VERSION ✅

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

const auth = getAuth();

/* -------------------- TYPES -------------------- */

export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: any;
  updated_at: any;

  is_following?: boolean;
  is_followed_by?: boolean;
  is_self?: boolean;
}

/* -------------------- PROFILE -------------------- */

export async function getUserProfile(
  identifier: string,
): Promise<UserProfile | null> {
  let snap;

  if (identifier.length === 28) {
    snap = await getDoc(doc(db, "profiles", identifier));
  } else {
    const q = query(
      collection(db, "profiles"),
      where("username", "==", identifier),
      limit(1),
    );
    const res = await getDocs(q);
    if (res.empty) return null;
    snap = res.docs[0];
  }

  if (!snap.exists()) return null;

  const profile = { id: snap.id, ...(snap.data() as any) };

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

/* -------------------- UPDATE PROFILE -------------------- */

export async function updateUserProfile(
  updates: Partial<UserProfile>,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  await updateDoc(doc(db, "profiles", user.uid), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/* -------------------- FOLLOW STATUS -------------------- */

export async function getFollowStatus(followerId: string, followingId: string) {
  const q1 = query(
    collection(db, "follows"),
    where("follower_id", "==", followerId),
    where("following_id", "==", followingId),
    limit(1),
  );

  const q2 = query(
    collection(db, "follows"),
    where("follower_id", "==", followingId),
    where("following_id", "==", followerId),
    limit(1),
  );

  const [r1, r2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  return {
    is_following: !r1.empty,
    is_followed_by: !r2.empty,
  };
}

/* -------------------- TOGGLE FOLLOW -------------------- */

export async function toggleFollow(followingId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (user.uid === followingId) throw new Error("Cannot follow yourself");

  const q = query(
    collection(db, "follows"),
    where("follower_id", "==", user.uid),
    where("following_id", "==", followingId),
    limit(1),
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    // UNFOLLOW
    await deleteDoc(snap.docs[0].ref);

    await Promise.all([
      updateDoc(doc(db, "profiles", followingId), {
        follower_count: increment(-1),
      }),
      updateDoc(doc(db, "profiles", user.uid), {
        following_count: increment(-1),
      }),
    ]);

    return { following: false };
  }

  // FOLLOW
  await setDoc(doc(collection(db, "follows")), {
    follower_id: user.uid,
    following_id: followingId,
    created_at: serverTimestamp(),
  });

  await Promise.all([
    updateDoc(doc(db, "profiles", followingId), {
      follower_count: increment(1),
    }),
    updateDoc(doc(db, "profiles", user.uid), {
      following_count: increment(1),
    }),
  ]);

  await setDoc(doc(collection(db, "notifications")), {
    type: "follow",
    sender_id: user.uid,
    receiver_id: followingId,
    created_at: serverTimestamp(),
  });

  return { following: true };
}

/* -------------------- FOLLOWERS -------------------- */

export async function getUserFollowers(userId: string) {
  const q = query(
    collection(db, "follows"),
    where("following_id", "==", userId),
    orderBy("created_at", "desc"),
  );

  const snap = await getDocs(q);

  const userIds = snap.docs.map((d) => d.data().follower_id);

  return getUsersByIds(userIds);
}

export async function getUserFollowing(userId: string) {
  const q = query(
    collection(db, "follows"),
    where("follower_id", "==", userId),
    orderBy("created_at", "desc"),
  );

  const snap = await getDocs(q);

  const userIds = snap.docs.map((d) => d.data().following_id);

  return getUsersByIds(userIds);
}

/* -------------------- SEARCH -------------------- */

export async function searchUsers(text: string) {
  const q = query(
    collection(db, "profiles"),
    orderBy("username_lc"),
    limit(20),
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter(
      (u) =>
        u.username?.toLowerCase().includes(text.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(text.toLowerCase()),
    );
}

/* -------------------- USERS BY IDS -------------------- */

export async function getUsersByIds(ids: string[]) {
  if (!ids.length) return [];

  const results: UserProfile[] = [];

  for (const id of ids) {
    const snap = await getDoc(doc(db, "profiles", id));
    if (snap.exists()) {
      results.push({ id, ...(snap.data() as any) });
    }
  }

  return results;
}

/* -------------------- SUBSCRIBE -------------------- */

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile) => void,
) {
  return onSnapshot(doc(db, "profiles", userId), (snap) => {
    if (!snap.exists()) return;
    callback({ id: snap.id, ...(snap.data() as any) });
  });
}
