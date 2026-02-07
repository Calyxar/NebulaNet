import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FollowStatus = "none" | "pending" | "accepted";

export function useFollowStatus(targetUserId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-status", user?.id, targetUserId],
    enabled: !!user?.id && !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return "none" as FollowStatus;
      return (data.status as FollowStatus) ?? "none";
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

      // trigger will set pending/accepted depending on target profile privacy
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) throw error;
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

      // optimistic status
      const next: FollowStatus = targetIsPrivate ? "pending" : "accepted";
      qc.setQueryData(["follow-status", user?.id, targetUserId], next);

      // optional: optimistic stats updates (if you cache them)
      // - if private => no count change
      // - if public => followers++ and following++
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

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
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

      // optimistic stats rollback:
      // if status was accepted, decrement counts
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
