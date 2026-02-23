export const qk = {
  social: {
    followStatus: (viewerId?: string, targetId?: string) =>
      ["follow-status", viewerId ?? "", targetId ?? ""] as const,
    userStats: (userId?: string) => ["user-stats", userId ?? ""] as const,
    myFollowing: (userId?: string) => ["my-following", userId ?? ""] as const,
    myFollowers: (userId?: string) => ["my-followers", userId ?? ""] as const,
    myFollowingWithStatus: (userId?: string) =>
      ["my-following-with-status", userId ?? ""] as const,
    requestedFollowers: (userId?: string) =>
      ["requested-followers", userId ?? ""] as const,
    myBlocks: (userId?: string) => ["my-blocks", userId ?? ""] as const,
    profilePrivacyFlags: (profileId?: string) =>
      ["profile-privacy-flags", profileId ?? ""] as const,
    userProfile: (username?: string) => ["user-profile", username ?? ""] as const,
  },
} as const;
