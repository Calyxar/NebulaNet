// lib/queryKeys/invalidateSocial.ts
import type { QueryClient } from "@tanstack/react-query";

export function invalidateAfterBlock(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  // Lists
  qc.invalidateQueries({ queryKey: ["my-followers", myId] });
  qc.invalidateQueries({ queryKey: ["my-following-with-status", myId] });
  qc.invalidateQueries({ queryKey: ["requested-followers", myId] });
  qc.invalidateQueries({ queryKey: ["my-blocks", myId] });

  // Counts + notifications
  qc.invalidateQueries({ queryKey: ["user-stats", myId] });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  // Feed / explore / stories (adjust to your real keys)
  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });
  qc.invalidateQueries({ queryKey: ["explore"] });
  qc.invalidateQueries({ queryKey: ["stories"] });

  // Profile caches
  if (targetId) {
    qc.invalidateQueries({ queryKey: ["user-stats", targetId] });
    qc.invalidateQueries({ queryKey: ["user-posts", targetId] });
    qc.invalidateQueries({ queryKey: ["follow-edge", myId, targetId] });
    qc.invalidateQueries({ queryKey: ["profile-privacy-flags", targetId] });
  }

  // If you cache profile by username, invalidate that exact entry too
  if (targetUsername) {
    qc.invalidateQueries({ queryKey: ["user-profile", targetUsername] });
  }

  // Safe fallback (broad)
  qc.invalidateQueries({ queryKey: ["user-profile"] });
}

export function invalidateAfterUnfollow(
  qc: QueryClient,
  myId: string,
  targetId?: string,
  targetUsername?: string,
) {
  qc.invalidateQueries({ queryKey: ["my-following-with-status", myId] });
  qc.invalidateQueries({ queryKey: ["my-followers", myId] });
  qc.invalidateQueries({ queryKey: ["user-stats", myId] });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });

  if (targetId) {
    qc.invalidateQueries({ queryKey: ["follow-edge", myId, targetId] });
    qc.invalidateQueries({ queryKey: ["user-stats", targetId] });
    qc.invalidateQueries({ queryKey: ["user-posts", targetId] });
  }
  if (targetUsername) {
    qc.invalidateQueries({ queryKey: ["user-profile", targetUsername] });
  }
}

export function invalidateAfterApproveDeny(
  qc: QueryClient,
  myId: string,
  followerId?: string,
  followerUsername?: string,
) {
  qc.invalidateQueries({ queryKey: ["requested-followers", myId] });
  qc.invalidateQueries({ queryKey: ["my-followers", myId] });
  qc.invalidateQueries({ queryKey: ["my-following-with-status", myId] });
  qc.invalidateQueries({ queryKey: ["user-stats", myId] });
  qc.invalidateQueries({ queryKey: ["notifications"] });

  qc.invalidateQueries({ queryKey: ["feed"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });

  if (followerId) {
    qc.invalidateQueries({ queryKey: ["follow-edge", followerId, myId] });
  }
  if (followerUsername) {
    qc.invalidateQueries({ queryKey: ["user-profile", followerUsername] });
  }
}
