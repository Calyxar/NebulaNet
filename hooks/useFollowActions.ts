// hooks/useFollowActions.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export type FollowStatus = "none" | "pending" | "accepted";

export function useFollowStatus(targetUserId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-status", user?.id, targetUserId],
    enabled: !!user?.id && !!targetUserId,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", user!.uid),
          where("following_id", "==", targetUserId!),
        ),
      );
      if (snap.empty) return "none" as FollowStatus;
      return ((snap.docs[0].data() as any).status as FollowStatus) ?? "none";
    },
  });
}

export function useFollowActions(
  targetUserId?: string,
  targetIsPrivate?: boolean,
) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const follow = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetUserId) throw new Error("Missing ids");
      await addDoc(collection(db, "follows"), {
        follower_id: user.uid,
        following_id: targetUserId,
        status: targetIsPrivate ? "pending" : "accepted",
        created_at: new Date().toISOString(),
      });
      return true;
    },
    onMutate: async () => {
      await qc.cancelQueries({
        queryKey: ["follow-status", user?.id, targetUserId],
      });
      const prev = qc.getQueryData<FollowStatus>([
        "follow-status",
        user?.id,
        targetUserId,
      ]);
      const next: FollowStatus = targetIsPrivate ? "pending" : "accepted";
      qc.setQueryData(["follow-status", user?.id, targetUserId], next);
      if (!targetIsPrivate) {
        qc.setQueryData(["user-stats", targetUserId], (old: any) =>
          old ? { ...old, followers: (old.followers ?? 0) + 1 } : old,
        );
        qc.setQueryData(["user-stats", user?.id], (old: any) =>
          old ? { ...old, following: (old.following ?? 0) + 1 } : old,
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["follow-status", user?.id, targetUserId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["follow-status", user?.id, targetUserId],
      });
      qc.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      qc.invalidateQueries({ queryKey: ["user-stats", targetUserId] });
      qc.invalidateQueries({ queryKey: ["my-following", user?.id] });
    },
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetUserId) throw new Error("Missing ids");
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", user.uid),
          where("following_id", "==", targetUserId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      return true;
    },
    onMutate: async () => {
      await qc.cancelQueries({
        queryKey: ["follow-status", user?.id, targetUserId],
      });
      const prev = qc.getQueryData<FollowStatus>([
        "follow-status",
        user?.id,
        targetUserId,
      ]);
      qc.setQueryData(["follow-status", user?.id, targetUserId], "none");
      if (prev === "accepted") {
        qc.setQueryData(["user-stats", targetUserId], (old: any) =>
          old
            ? { ...old, followers: Math.max(0, (old.followers ?? 0) - 1) }
            : old,
        );
        qc.setQueryData(["user-stats", user?.id], (old: any) =>
          old
            ? { ...old, following: Math.max(0, (old.following ?? 0) - 1) }
            : old,
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["follow-status", user?.id, targetUserId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["follow-status", user?.id, targetUserId],
      });
      qc.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      qc.invalidateQueries({ queryKey: ["user-stats", targetUserId] });
      qc.invalidateQueries({ queryKey: ["my-following", user?.id] });
    },
  });

  return {
    follow: follow.mutate,
    unfollow: unfollow.mutate,
    isFollowingBusy: follow.isPending || unfollow.isPending,
  };
}
