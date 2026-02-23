// lib/queryKeys/invalidateSocial.ts
import type { QueryClient } from "@tanstack/react-query";
import { qk } from "./social";

export function invalidateAfterBlock(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  // Relationship lists
  qc.invalidateQueries({ queryKey: qk.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.myFollowing(myId) });
  qc.invalidateQueries({ queryKey: qk.requestedFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.myBlocks(myId) });

  // My stats + notifications
  qc.invalidateQueries({ queryKey: qk.userStats(myId) });
  qc.invalidateQueries({ queryKey: qk.notifications() });

  // Feeds / discovery
  qc.invalidateQueries({ queryKey: qk.feed("home") });
  qc.invalidateQueries({ queryKey: qk.feed("global") });
  qc.invalidateQueries({ queryKey: qk.explore() });
  qc.invalidateQueries({ queryKey: qk.stories() });

  // Target caches
  if (targetId) {
    qc.invalidateQueries({ queryKey: qk.userStats(targetId) });
    qc.invalidateQueries({ queryKey: qk.userPosts(targetId) });
    qc.invalidateQueries({ queryKey: qk.followEdge(myId, targetId) });
    qc.invalidateQueries({ queryKey: qk.profilePrivacyFlags(targetId) });
  }

  if (targetUsername) {
    qc.invalidateQueries({ queryKey: qk.profileByUsername(targetUsername) });
  }
}

export function invalidateAfterUnfollow(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  qc.invalidateQueries({ queryKey: qk.myFollowing(myId) });
  qc.invalidateQueries({ queryKey: qk.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.userStats(myId) });
  qc.invalidateQueries({ queryKey: qk.notifications() });

  qc.invalidateQueries({ queryKey: qk.feed("home") });
  qc.invalidateQueries({ queryKey: qk.feed("following") });

  if (targetId) {
    qc.invalidateQueries({ queryKey: qk.followEdge(myId, targetId) });
    qc.invalidateQueries({ queryKey: qk.userStats(targetId) });
    qc.invalidateQueries({ queryKey: qk.userPosts(targetId) });
  }

  if (targetUsername) {
    qc.invalidateQueries({ queryKey: qk.profileByUsername(targetUsername) });
  }
}

export function invalidateAfterApproveDeny(
  qc: QueryClient,
  myId: string,
  followerId?: string,
  followerUsername?: string,
) {
  qc.invalidateQueries({ queryKey: qk.requestedFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.myFollowers(myId) });
  qc.invalidateQueries({ queryKey: qk.myFollowing(myId) });
  qc.invalidateQueries({ queryKey: qk.userStats(myId) });
  qc.invalidateQueries({ queryKey: qk.notifications() });

  qc.invalidateQueries({ queryKey: qk.feed("home") });

  if (followerId) {
    qc.invalidateQueries({ queryKey: qk.followEdge(followerId, myId) });
  }

  if (followerUsername) {
    qc.invalidateQueries({ queryKey: qk.profileByUsername(followerUsername) });
  }
}
