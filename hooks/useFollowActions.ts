// hooks/useFollowActions.ts — React Native Firebase ✅

import { useAuth } from "@/hooks/useAuth";
import { qk } from "@/lib/queryKeys/social";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FollowStatus = "none" | "pending" | "accepted";

export function useFollowStatus(
  targetUserId?: string,
  initialStatus?: FollowStatus,
) {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: qk.social.followStatus(uid, targetUserId),
    enabled: !!uid && !!targetUserId,
    initialData: initialStatus,
    staleTime: 10_000,
    queryFn: async () => {
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", uid!)
        .where("following_id", "==", targetUserId!)
        .get();
      if (snap.empty) return "none" as FollowStatus;
      const status = snap.docs[0].data().status;
      return (status ?? "none") as FollowStatus;
    },
  });
}

function bumpProfileCount(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
  field: "follower_count" | "following_count",
  delta: number,
) {
  // Update every ["user", <username>] entry whose id matches this userId.
  qc.setQueriesData<any>({ queryKey: ["user"] }, (old: any) => {
    if (!old || old.id !== userId) return old;
    return { ...old, [field]: Math.max(0, (old[field] ?? 0) + delta) };
  });
  // Same for ["profile-by-username", <username>] if that cache holds counts.
  qc.setQueriesData<any>({ queryKey: ["profile-by-username"] }, (old: any) => {
    if (!old || old.id !== userId) return old;
    return { ...old, [field]: Math.max(0, (old[field] ?? 0) + delta) };
  });
}

export function useFollowActions(
  targetUserId?: string,
  targetIsPrivate?: boolean,
) {
  const { user } = useAuth();
  const uid = user?.uid;
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({
      queryKey: qk.social.followStatus(uid, targetUserId),
    });
    qc.invalidateQueries({ queryKey: qk.social.userStats(uid) });
    qc.invalidateQueries({ queryKey: qk.social.userStats(targetUserId) });
    qc.invalidateQueries({ queryKey: qk.social.myFollowing(uid) });
    // Profile caches that display the counts
    qc.invalidateQueries({ queryKey: ["user"] });
    qc.invalidateQueries({ queryKey: ["currentUser"] });
    qc.invalidateQueries({ queryKey: ["profile-by-username"] });
    // Follower / following lists
    qc.invalidateQueries({ queryKey: ["followers", targetUserId] });
    qc.invalidateQueries({ queryKey: ["following", targetUserId] });
    qc.invalidateQueries({ queryKey: ["followers", uid] });
    qc.invalidateQueries({ queryKey: ["following", uid] });
    // Suggested users (which filter out already-followed accounts)
    qc.invalidateQueries({ queryKey: ["suggested-users"] });
  };

  const follow = useMutation({
    mutationFn: async () => {
      if (!uid || !targetUserId) throw new Error("Missing user IDs");
      await firestore()
        .collection("follows")
        .add({
          follower_id: uid,
          following_id: targetUserId,
          status: targetIsPrivate ? "pending" : "accepted",
          created_at: firestore.FieldValue.serverTimestamp(),
        });
      return true;
    },
    onMutate: async () => {
      await qc.cancelQueries({
        queryKey: qk.social.followStatus(uid, targetUserId),
      });
      const prev = qc.getQueryData<FollowStatus>(
        qk.social.followStatus(uid, targetUserId),
      );
      const next: FollowStatus = targetIsPrivate ? "pending" : "accepted";
      qc.setQueryData(qk.social.followStatus(uid, targetUserId), next);

      // Only accepted follows affect counts.
      if (!targetIsPrivate && uid && targetUserId) {
        bumpProfileCount(qc, targetUserId, "follower_count", 1);
        bumpProfileCount(qc, uid, "following_count", 1);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(qk.social.followStatus(uid, targetUserId), ctx.prev);
      }
    },
    onSettled: invalidateAll,
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      if (!uid || !targetUserId) throw new Error("Missing user IDs");
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", uid)
        .where("following_id", "==", targetUserId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
      return true;
    },
    onMutate: async () => {
      await qc.cancelQueries({
        queryKey: qk.social.followStatus(uid, targetUserId),
      });
      const prev = qc.getQueryData<FollowStatus>(
        qk.social.followStatus(uid, targetUserId),
      );
      qc.setQueryData(qk.social.followStatus(uid, targetUserId), "none");

      // Only decrement if the previous state was accepted.
      if (prev === "accepted" && uid && targetUserId) {
        bumpProfileCount(qc, targetUserId, "follower_count", -1);
        bumpProfileCount(qc, uid, "following_count", -1);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(qk.social.followStatus(uid, targetUserId), ctx.prev);
      }
    },
    onSettled: invalidateAll,
  });

  return {
    follow: follow.mutate,
    unfollow: unfollow.mutate,
    isFollowingBusy: follow.isPending || unfollow.isPending,
  };
}
