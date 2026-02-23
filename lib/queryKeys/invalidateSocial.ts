// lib/queryKeys/invalidateSocial.ts
import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/social";

export function invalidateAfterBlock(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  // Lists
  qc.invalidateQueries({ queryKey: qk.social.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.social.myFollowingWithStatus(myId) });
  qc.invalidateQueries({ queryKey: qk.social.requestedFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.social.myBlocks(myId) });

  // Counts + notifications
  qc.invalidateQueries({ queryKey: qk.social.userStats(myId) });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  // Feed / explore / stories (adjust to your real keys)
  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });
  qc.invalidateQueries({ queryKey: ["explore"] });
  qc.invalidateQueries({ queryKey: ["stories"] });

  // Profile caches
  if (targetId) {
    qc.invalidateQueries({ queryKey: qk.social.userStats(targetId) });
    qc.invalidateQueries({ queryKey: ["user-posts", targetId] });
    qc.invalidateQueries({ queryKey: ["follow-edge", myId, targetId] });
    qc.invalidateQueries({ queryKey: qk.social.profilePrivacyFlags(targetId) });
  }

  // If you cache profile by username, invalidate that exact entry too
  if (targetUsername) {
    qc.invalidateQueries({ queryKey: qk.social.userProfile(targetUsername) });
  }

  // Safe fallback (broad)
  qc.invalidateQueries({ queryKey: qk.social.userProfile() });
}

export function invalidateAfterUnfollow(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  qc.invalidateQueries({ queryKey: qk.social.myFollowingWithStatus(myId) });
  qc.invalidateQueries({ queryKey: qk.social.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.social.userStats(myId) });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });

  if (targetId) {
    qc.invalidateQueries({ queryKey: ["follow-edge", myId, targetId] });
    qc.invalidateQueries({ queryKey: qk.social.userStats(targetId) });
    qc.invalidateQueries({ queryKey: ["user-posts", targetId] });
  }
  if (targetUsername) {
    qc.invalidateQueries({ queryKey: qk.social.userProfile(targetUsername) });
  }
}

export function invalidateAfterApproveDeny(
  qc: QueryClient,
  myId: string,
  followerId?: string,
  followerUsername?: string,
) {
  qc.invalidateQueries({ queryKey: qk.social.requestedFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.social.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.social.myFollowingWithStatus(myId) });
  qc.invalidateQueries({ queryKey: qk.social.userStats(myId) });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });

  if (followerId) {
    qc.invalidateQueries({ queryKey: ["follow-edge", followerId, myId] });
  }
  if (followerUsername) {
    qc.invalidateQueries({ queryKey: qk.social.userProfile(followerUsername) });
  }
}
