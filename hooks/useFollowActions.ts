// hooks/useFollowActions.ts — React Native Firebase ✅

import { useAuth } from "@/hooks/useAuth";
import { qk } from "@/lib/queryKeys/social";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FollowStatus = "none" | "pending" | "accepted";

export function useFollowStatus(targetUserId?: string) {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: qk.social.followStatus(uid, targetUserId),
    enabled: !!uid && !!targetUserId,
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

export function useFollowActions(
  targetUserId?: string,
  targetIsPrivate?: boolean,
) {
  const { user } = useAuth();
  const uid = user?.uid;
  const qc = useQueryClient();

  const follow = useMutation({
    mutationFn: async () => {
      if (!uid || !targetUserId) throw new Error("Missing user IDs");
      await firestore()
        .collection("follows")
        .add({
          follower_id: uid,
          following_id: targetUserId,
          status: targetIsPrivate ? "pending" : "accepted",
          created_at: new Date().toISOString(),
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
      if (!targetIsPrivate) {
        qc.setQueryData(qk.social.userStats(targetUserId), (old: any) =>
          old ? { ...old, followers: (old.followers ?? 0) + 1 } : old,
        );
        qc.setQueryData(qk.social.userStats(uid), (old: any) =>
          old ? { ...old, following: (old.following ?? 0) + 1 } : old,
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(qk.social.followStatus(uid, targetUserId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.social.followStatus(uid, targetUserId),
      });
      qc.invalidateQueries({ queryKey: qk.social.userStats(uid) });
      qc.invalidateQueries({ queryKey: qk.social.userStats(targetUserId) });
      qc.invalidateQueries({ queryKey: qk.social.myFollowing(uid) });
    },
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
      if (prev === "accepted") {
        qc.setQueryData(qk.social.userStats(targetUserId), (old: any) =>
          old
            ? { ...old, followers: Math.max(0, (old.followers ?? 0) - 1) }
            : old,
        );
        qc.setQueryData(qk.social.userStats(uid), (old: any) =>
          old
            ? { ...old, following: Math.max(0, (old.following ?? 0) - 1) }
            : old,
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(qk.social.followStatus(uid, targetUserId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.social.followStatus(uid, targetUserId),
      });
      qc.invalidateQueries({ queryKey: qk.social.userStats(uid) });
      qc.invalidateQueries({ queryKey: qk.social.userStats(targetUserId) });
      qc.invalidateQueries({ queryKey: qk.social.myFollowing(uid) });
    },
  });

  return {
    follow: follow.mutate,
    unfollow: unfollow.mutate,
    isFollowingBusy: follow.isPending || unfollow.isPending,
  };
}
