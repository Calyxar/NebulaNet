// hooks/useDeleteAccount.ts — FIREBASE ✅

import { useMutation } from "@tanstack/react-query";
import { deleteAccountRequest } from "../lib/firestore/deleteAccount";

type Input = { reason: string | null };

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (_input: Input) => {
      const data = await deleteAccountRequest();
      if (!data?.success) throw new Error("Delete failed.");
      return data;
    },
  });
}
