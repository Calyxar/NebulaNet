// lib/firestore/refs.ts — FIRESTORE ✅ (COMPLETED + UPDATED)

import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    type CollectionReference,
    type DocumentReference,
} from "firebase/firestore";

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

  // interactions (likes, saves, shares, etc.)
  post_likes: "post_likes",
  post_saves: "post_saves",
  post_shares: "post_shares",

  // optional support collections you already use
  support_reports: "support_reports",
} as const;

/* =========================
   ID builders (consistent)
========================= */

// follow: followerId_followingId (matches your earlier pattern)
export const followId = (followerId: string, followingId: string) =>
  `${followerId}_${followingId}`;

// block: blockerId_blockedId
export const blockId = (blockerId: string, blockedId: string) =>
  `${blockerId}_${blockedId}`;

// participant: conversationId_userId
export const participantId = (conversationId: string, userId: string) =>
  `${conversationId}_${userId}`;

// like/save/share: postId_userId (fast lookups + uniqueness)
export const postUserId = (postId: string, userId: string) =>
  `${postId}_${userId}`;

/* =========================
   Generic refs
========================= */

export const colRef = <T = any>(name: string) =>
  collection(db, name) as CollectionReference<T>;

export const docRef = <T = any>(name: string, id: string) =>
  doc(db, name, id) as DocumentReference<T>;

/* =========================
   Strong-ish specific refs
========================= */

// profiles
export const profileRef = (uid: string) => docRef(COL.profiles, uid);
export const settingsRef = (uid: string) => docRef(COL.user_settings, uid);
export const interestsRef = (uid: string) => docRef(COL.user_interests, uid);

// posts/comments
export const postRef = (postId: string) => docRef(COL.posts, postId);
export const commentRef = (commentId: string) =>
  docRef(COL.comments, commentId);

// communities
export const communityRef = (communityId: string) =>
  docRef(COL.communities, communityId);

// chat
export const conversationRef = (conversationId: string) =>
  docRef(COL.conversations, conversationId);
export const messageRef = (messageId: string) =>
  docRef(COL.messages, messageId);
export const participantRef = (conversationId: string, userId: string) =>
  docRef(COL.conversation_participants, participantId(conversationId, userId));

// follows/blocks
export const followRef = (followerId: string, followingId: string) =>
  docRef(COL.follows, followId(followerId, followingId));
export const blockRef = (blockerId: string, blockedId: string) =>
  docRef(COL.user_blocks, blockId(blockerId, blockedId));

// interactions (likes/saves/shares)
export const postLikeRef = (postId: string, userId: string) =>
  docRef(COL.post_likes, postUserId(postId, userId));
export const postSaveRef = (postId: string, userId: string) =>
  docRef(COL.post_saves, postUserId(postId, userId));
export const postShareRef = (postId: string, userId: string) =>
  docRef(COL.post_shares, postUserId(postId, userId));
