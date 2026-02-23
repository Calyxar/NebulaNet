// lib/social/useBlockUserMutation.ts — FIRESTORE FINAL ✅
// Fully replaces Supabase version
// Preserves react-query structure & optimistic updates
// Mirrors old Supabase trigger cleanup behavior client-side

import { db } from "@/lib/firebase";
import { invalidateAfterBlock } from "@/lib/queryKeys/invalidateSocial";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

type Args = {
  qc: QueryClient;
  myId: string;
};

type BlockInput = {
  targetId: string;
  targetUsername?: string;
};

async function cleanupAfterBlock(myId: string, targetId: string) {
  // ---- Remove follows both directions ----
  const q1 = query(
    collection(db, "follows"),
    where("follower_id", "==", myId),
    where("following_id", "==", targetId),
    limit(25),
  );

  const q2 = query(
    collection(db, "follows"),
    where("follower_id", "==", targetId),
    where("following_id", "==", myId),
    limit(25),
  );

  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  await Promise.all([
    ...s1.docs.map((d) => deleteDoc(d.ref)),
    ...s2.docs.map((d) => deleteDoc(d.ref)),
  ]);

  // ---- Remove notifications both directions ----
  const n1 = query(
    collection(db, "notifications"),
    where("sender_id", "==", myId),
    where("receiver_id", "==", targetId),
    limit(50),
  );

  const n2 = query(
    collection(db, "notifications"),
    where("sender_id", "==", targetId),
    where("receiver_id", "==", myId),
    limit(50),
  );

  const [ns1, ns2] = await Promise.all([getDocs(n1), getDocs(n2)]);

  await Promise.all([
    ...ns1.docs.map((d) => deleteDoc(d.ref)),
    ...ns2.docs.map((d) => deleteDoc(d.ref)),
  ]);
}

export function useBlockUserMutation({ qc, myId }: Args) {
  return useMutation({
    mutationFn: async ({ targetId }: BlockInput) => {
      if (!myId) throw new Error("Missing myId");
      if (!targetId) throw new Error("Missing targetId");
      if (myId === targetId) throw new Error("Cannot block yourself");

      const blockId = `${myId}_${targetId}`;

      // Create block doc (id prevents duplicates)
      await setDoc(doc(db, "user_blocks", blockId), {
        blocker_id: myId,
        blocked_id: targetId,
        created_at: serverTimestamp(),
      });

      // Mirror old Supabase trigger behavior
      await cleanupAfterBlock(myId, targetId);

      return { targetId };
    },

    /* -------------------- OPTIMISTIC UPDATE -------------------- */

    onMutate: async ({ targetId }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["my-followers", myId] }),
        qc.cancelQueries({ queryKey: ["my-following-with-status", myId] }),
        qc.cancelQueries({ queryKey: ["requested-followers", myId] }),
        qc.cancelQueries({ queryKey: ["my-blocks", myId] }),
      ]);

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

      if (Array.isArray(prevFollowers)) {
        qc.setQueryData(
          ["my-followers", myId],
          prevFollowers.filter((u: any) => u?.id !== targetId),
        );
      }

      if (Array.isArray(prevFollowing)) {
        qc.setQueryData(
          ["my-following-with-status", myId],
          prevFollowing.filter(
            (r: any) => r?.id !== targetId && r?.following_id !== targetId,
          ),
        );
      }

      if (Array.isArray(prevRequests)) {
        qc.setQueryData(
          ["requested-followers", myId],
          prevRequests.filter(
            (r: any) => r?.id !== targetId && r?.follower_id !== targetId,
          ),
        );
      }

      return { prevFollowers, prevFollowing, prevRequests, prevBlocks };
    },

    /* -------------------- ROLLBACK ON ERROR -------------------- */

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

    /* -------------------- SUCCESS INVALIDATION -------------------- */

    onSuccess: (_data, vars) => {
      invalidateAfterBlock(qc, myId, vars.targetId, vars.targetUsername);
    },
  });
}
