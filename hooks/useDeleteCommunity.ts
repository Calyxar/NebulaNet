import { functions } from "@/lib/firebase";
import { useMutation } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";

type Input = { communityId: string };
type Output = { success: boolean };

export function useDeleteCommunity() {
  return useMutation({
    mutationFn: async ({ communityId }: Input) => {
      const fn = httpsCallable<Input, Output>(functions, "deleteCommunity");
      const res = await fn({ communityId });
      if (!res.data?.success) throw new Error("Delete failed");
      return res.data;
    },
  });
}
