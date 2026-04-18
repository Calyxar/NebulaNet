// lib/firestore/deleteCommunity.ts

import { functions } from "@/lib/firebase";

type DeleteCommunityResult = {
  success: boolean;
  message: string;
};

export async function deleteCommunityRequest(
  communityId: string,
): Promise<DeleteCommunityResult> {
  const result = await functions.httpsCallable("deleteCommunity")({
    communityId,
  });
  return result.data as DeleteCommunityResult;
}
