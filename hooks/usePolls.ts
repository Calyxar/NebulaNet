// hooks/usePoll.ts
// React Query hooks for poll voting + reading the current user's vote
//
// ✅ useUserVote()  — checks if user voted; returns their chosen option IDs
// ✅ useVotePoll()  — optimistic mutation: updates PollCard UI before server confirms

import { postKeys } from "@/hooks/usePosts";
import { getUserVote, votePoll } from "@/lib/firestore/polls";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* =====================================================
   QUERY KEYS
===================================================== */

export const pollVoteKeys = {
  all: ["poll_votes"] as const,
  user: (postId: string) => [...pollVoteKeys.all, "user", postId] as const,
};

/* =====================================================
   GET USER VOTE
===================================================== */

/**
 * Returns the option IDs the current user selected, or null if not voted.
 * Cached per-post; stale after 30s to re-check on focus.
 */
export function useUserVote(postId: string | undefined) {
  const id = (postId ?? "").trim();

  return useQuery<string[] | null>({
    queryKey: pollVoteKeys.user(id || "no-id"),
    queryFn: () => (id ? getUserVote(id) : null),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/* =====================================================
   VOTE ON POLL (OPTIMISTIC)
===================================================== */

/**
 * Casts a vote and optimistically updates the post cache so PollCard
 * shows the results immediately without waiting for a re-fetch.
 */
export function useVotePoll(postId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (optionIds: string[]) => votePoll(postId, optionIds),

    onMutate: async (optionIds: string[]) => {
      // Cancel any in-flight fetches for this post
      await qc.cancelQueries({ queryKey: postKeys.detail(postId) });
      await qc.cancelQueries({ queryKey: pollVoteKeys.user(postId) });

      // Snapshot for rollback
      const prevPost = qc.getQueryData(postKeys.detail(postId));
      const prevVote = qc.getQueryData<string[] | null>(
        pollVoteKeys.user(postId),
      );

      // Optimistically update the post's poll data
      qc.setQueryData<any>(postKeys.detail(postId), (old: any) => {
        if (!old?.poll) return old;

        const poll = old.poll;
        const allow_multiple = poll.allow_multiple ?? false;
        const chosen = allow_multiple ? optionIds : [optionIds[0]];

        const updatedOptions = poll.options.map((opt: any) => ({
          ...opt,
          votes: chosen.includes(opt.id) ? opt.votes + 1 : opt.votes,
        }));

        return {
          ...old,
          poll: {
            ...poll,
            options: updatedOptions,
            total_votes: (poll.total_votes ?? 0) + chosen.length,
          },
        };
      });

      // Optimistically mark as voted
      qc.setQueryData(pollVoteKeys.user(postId), optionIds);

      return { prevPost, prevVote };
    },

    onError: (_err, _optionIds, ctx: any) => {
      // Roll back on failure
      if (ctx?.prevPost !== undefined) {
        qc.setQueryData(postKeys.detail(postId), ctx.prevPost);
      }
      if (ctx?.prevVote !== undefined) {
        qc.setQueryData(pollVoteKeys.user(postId), ctx.prevVote);
      }
    },

    onSettled: () => {
      // Re-sync both caches after transaction resolves
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) });
      qc.invalidateQueries({ queryKey: pollVoteKeys.user(postId) });
    },
  });
}
