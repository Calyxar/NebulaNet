import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";
import { supabase } from "@/lib/supabase";
import { useMutation, type QueryClient } from "@tanstack/react-query";

type Args = {
  qc: QueryClient;
  myId: string;
};

type BlockInput = {
  targetId: string;
  targetUsername?: string;
};

export function useBlockUserMutation({ qc, myId }: Args) {
  return useMutation({
    mutationFn: async ({ targetId }: BlockInput) => {
      // Insert block (trigger cleans follows/notifications/story_views)
      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: myId,
        blocked_id: targetId,
      });
      if (error) throw error;
      return { targetId };
    },

    // Optimistic: remove user from the *visible* social lists immediately
    onMutate: async ({ targetId }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["my-followers", myId] }),
        qc.cancelQueries({ queryKey: ["my-following-with-status", myId] }),
        qc.cancelQueries({ queryKey: ["requested-followers", myId] }),
        qc.cancelQueries({ queryKey: ["my-blocks", myId] }),
      ]);

      // Followers list shape varies by your implementation, but most are UserRowModel[]
      const prevFollowers = qc.getQueryData<any[]>(["my-followers", myId]);
      const prevFollowing = qc.getQueryData<any[]>([
        "my-following-with-status",
        myId,
      ]);
      const prevRequests = qc.getQueryData<any[]>([
        "requested-followers",
        myId,
      ]);
      const prevBlocks = qc.getQueryData<any[]>(["my-blocks", myId]);

      // If those lists are arrays of {id} items (UserRowModel), filter by id
      if (Array.isArray(prevFollowers)) {
        qc.setQueryData(
          ["my-followers", myId],
          prevFollowers.filter((u: any) => u?.id !== targetId),
        );
      }
      if (Array.isArray(prevFollowing)) {
        qc.setQueryData(
          ["my-following-with-status", myId],
          prevFollowing.filter((r: any) => {
            // could be join rows or UserRowModel
            return r?.id !== targetId && r?.following_id !== targetId;
          }),
        );
      }
      if (Array.isArray(prevRequests)) {
        qc.setQueryData(
          ["requested-followers", myId],
          prevRequests.filter((r: any) => {
            return r?.id !== targetId && r?.follower_id !== targetId;
          }),
        );
      }

      return { prevFollowers, prevFollowing, prevRequests, prevBlocks };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevFollowers)
        qc.setQueryData(["my-followers", myId], ctx.prevFollowers);
      if (ctx.prevFollowing)
        qc.setQueryData(["my-following-with-status", myId], ctx.prevFollowing);
      if (ctx.prevRequests)
        qc.setQueryData(["requested-followers", myId], ctx.prevRequests);
      if (ctx.prevBlocks) qc.setQueryData(["my-blocks", myId], ctx.prevBlocks);
    },

    onSuccess: (_data, vars) => {
      invalidateAfterBlock(qc, myId, vars.targetId, vars.targetUsername);
    },
  });
}
