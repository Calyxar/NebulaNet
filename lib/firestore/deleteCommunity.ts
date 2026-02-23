import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

type DeleteCommunityResult = {
  success: boolean;
  message: string;
};

export async function deleteCommunityRequest(
  communityId: string,
): Promise<DeleteCommunityResult> {
  const callable = httpsCallable<{ communityId: string }, DeleteCommunityResult>(
    functions,
    "deleteCommunity",
  );

  const result = await callable({ communityId });
  return result.data;
}
