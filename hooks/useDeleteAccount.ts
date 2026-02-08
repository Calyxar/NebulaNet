// hooks/useDeleteAccount.ts
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

type Input = { reason: string | null };

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (input: Input) => {
      const { data, error } = await supabase.functions.invoke(
        "delete-account",
        {
          body: input,
        },
      );

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error("Delete failed.");

      return data;
    },
  });
}
