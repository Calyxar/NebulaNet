// lib/firestore/refs.ts — FIRESTORE ✅ (COMPLETED + UPDATED)

import { db } from "@/lib/firebase";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

/* =========================
   Collection names
========================= */

export const COL = {
  profiles: "profiles",
  user_settings: "user_settings",
  user_interests: "user_interests",

  posts: "posts",
  comments: "comments",

  follows: "follows",
  notifications: "notifications",

  user_blocks: "user_blocks",

  communities: "communities",
  community_members: "community_members",
  community_moderators: "community_moderators",
  community_rules: "community_rules",

  conversations: "conversations",
  conversation_participants: "conversation_participants",
  messages: "messages",

  post_likes: "post_likes",
  post_saves: "post_saves",
  post_shares: "post_shares",

  support_reports: "support_reports",
} as const;

/* =========================
   ID builders
========================= */

export const followId = (followerId: string, followingId: string) =>
  `${followerId}_${followingId}`;

export const blockId = (blockerId: string, blockedId: string) =>
  `${blockerId}_${blockedId}`;

export const participantId = (conversationId: string, userId: string) =>
  `${conversationId}_${userId}`;

export const postUserId = (postId: string, userId: string) =>
  `${postId}_${userId}`;

/* =========================
   Generic refs
========================= */

export const colRef = <T extends FirebaseFirestoreTypes.DocumentData = FirebaseFirestoreTypes.DocumentData>(
  name: string,
): FirebaseFirestoreTypes.CollectionReference<T> =>
  db.collection(name) as FirebaseFirestoreTypes.CollectionReference<T>;

export const docRef = <T extends FirebaseFirestoreTypes.DocumentData = FirebaseFirestoreTypes.DocumentData>(
  name: string,
  id: string,
): FirebaseFirestoreTypes.DocumentReference<T> =>
  db.collection(name).doc(id) as FirebaseFirestoreTypes.DocumentReference<T>;

/* =========================
   Strong-ish specific refs
========================= */

export const profileRef = (uid: string) => docRef(COL.profiles, uid);
export const settingsRef = (uid: string) => docRef(COL.user_settings, uid);
export const interestsRef = (uid: string) => docRef(COL.user_interests, uid);

export const postRef = (postId: string) => docRef(COL.posts, postId);
export const commentRef = (commentId: string) =>
  docRef(COL.comments, commentId);

export const communityRef = (communityId: string) =>
  docRef(COL.communities, communityId);

export const conversationRef = (conversationId: string) =>
  docRef(COL.conversations, conversationId);
export const messageRef = (messageId: string) =>
  docRef(COL.messages, messageId);
export const participantRef = (conversationId: string, userId: string) =>
  docRef(
    COL.conversation_participants,
    participantId(conversationId, userId),
  );

export const followRef = (followerId: string, followingId: string) =>
  docRef(COL.follows, followId(followerId, followingId));
export const blockRef = (blockerId: string, blockedId: string) =>
  docRef(COL.user_blocks, blockId(blockerId, blockedId));

export const postLikeRef = (postId: string, userId: string) =>
  docRef(COL.post_likes, postUserId(postId, userId));
export const postSaveRef = (postId: string, userId: string) =>
  docRef(COL.post_saves, postUserId(postId, userId));
export const postShareRef = (postId: string, userId: string) =>
  docRef(COL.post_shares, postUserId(postId, userId));