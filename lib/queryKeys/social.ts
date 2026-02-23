// lib/queryKeys/social.ts

export type FeedScope = "home" | "global" | "following" | "community";
export type FeedSort = "new" | "top" | "hot";
export type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

export const qk = {
  notifications: () => ["notifications"] as const,
  unreadNotifications: (uid: string) =>
    ["notifications", "unread", uid] as const,

  myFollowers: (uid: string) => ["followers", uid] as const,
  myFollowing: (uid: string) => ["following", uid] as const,
  requestedFollowers: (uid: string) => ["followRequests", uid] as const,
  myBlocks: (uid: string) => ["blocks", uid] as const,
  followEdge: (fromUid: string, toUid: string) =>
    ["followEdge", fromUid, toUid] as const,

  userStats: (uid: string) => ["userStats", uid] as const,
  userPosts: (
    uid: string,
    params?: { cursor?: string | null; limit?: number },
  ) => ["userPosts", uid, params ?? {}] as const,

  profilePrivacyFlags: (uid: string) => ["profilePrivacyFlags", uid] as const,
  profileByUsername: (username: string) =>
    ["profileByUsername", username.toLowerCase()] as const,

  feed: (
    params: {
      scope?: FeedScope;
      sort?: FeedSort;
      timeRange?: TimeRange;
      communityId?: string | null;
      topic?: string | null;
      cursor?: string | null;
      limit?: number;
      hideNSFW?: boolean;
      viewerUid?: string | null;
    } = {},
  ) => ["feed", params] as const,

  explore: (
    params: {
      topic?: string | null;
      cursor?: string | null;
      limit?: number;
      hideNSFW?: boolean;
      viewerUid?: string | null;
    } = {},
  ) => ["explore", params] as const,

  trending: (
    params: {
      scope?: "global" | "community";
      communityId?: string | null;
      timeRange?: TimeRange;
      limit?: number;
      hideNSFW?: boolean;
      viewerUid?: string | null;
    } = {},
  ) => ["trending", params] as const,

  search: (params: {
    q: string;
    type?: "all" | "users" | "posts" | "communities";
    cursor?: string | null;
    limit?: number;
    hideNSFW?: boolean;
    viewerUid?: string | null;
  }) => ["search", params] as const,

  communities: (params?: { cursor?: string | null; limit?: number }) =>
    ["communities", params ?? {}] as const,

  communityBySlug: (slug: string) => ["community", "slug", slug] as const,
  communityById: (id: string) => ["community", "id", id] as const,

  communityPosts: (
    communityId: string,
    params?: { cursor?: string | null; limit?: number },
  ) => ["community", communityId, "posts", params ?? {}] as const,

  communityMembers: (communityId: string) =>
    ["community", communityId, "members"] as const,

  communityRules: (communityId: string) =>
    ["community", communityId, "rules"] as const,

  postById: (postId: string) => ["post", postId] as const,
  postComments: (
    postId: string,
    params?: { cursor?: string | null; limit?: number },
  ) => ["post", postId, "comments", params ?? {}] as const,

  stories: (params?: { uid?: string | null }) =>
    ["stories", params ?? {}] as const,
  storyById: (id: string) => ["story", id] as const,
  storySeen: (storyId: string, viewerUid: string) =>
    ["storySeen", storyId, viewerUid] as const,

  conversations: (uid: string) => ["conversations", uid] as const,
  conversationById: (conversationId: string) =>
    ["conversation", conversationId] as const,
  messages: (
    conversationId: string,
    params?: { cursor?: string | null; limit?: number },
  ) => ["messages", conversationId, params ?? {}] as const,
};
