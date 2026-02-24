// lib/firestore/deleteCommunity.ts

import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

type DeleteCommunityResult = { success: boolean; message?: string };

export async function deleteCommunityRequest(communityId: string) {
  const fn = httpsCallable<{ communityId: string }, DeleteCommunityResult>(
    functions,
    "deleteCommunity",
  );
  const res = await fn({ communityId });
  return res.data;
}
