// hooks/usePrivacySettings.ts
import { useAuth } from "@/hooks/useAuth";
import {
    DEFAULT_PRIVACY_SETTINGS,
    type PrivacySettings,
    isPrivacySelect,
} from "@/lib/queries/privacy";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function ensurePrivacyRow(userId: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as PrivacySettings;

  const { data: created, error: insertError } = await supabase
    .from("user_privacy_settings")
    .insert({ user_id: userId, ...DEFAULT_PRIVACY_SETTINGS })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as PrivacySettings;
}

type Patch = Partial<Omit<PrivacySettings, "user_id" | "updated_at">>;

export function usePrivacySettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["privacy-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      return ensurePrivacyRow(user.id);
    },
  });

  const m = useMutation({
    mutationFn: async (patch: Patch) => {
      if (!user?.id) throw new Error("Not signed in");

      const nextPatch: Patch = { ...patch };

      // sanitize select fields if something unknown gets passed in
      if (
        "who_can_comment" in nextPatch &&
        nextPatch.who_can_comment !== undefined &&
        !isPrivacySelect(nextPatch.who_can_comment)
      ) {
        delete nextPatch.who_can_comment;
      }

      if (
        "who_can_message" in nextPatch &&
        nextPatch.who_can_message !== undefined &&
        !isPrivacySelect(nextPatch.who_can_message)
      ) {
        delete nextPatch.who_can_message;
      }

      if (
        "mentions" in nextPatch &&
        nextPatch.mentions !== undefined &&
        !isPrivacySelect(nextPatch.mentions)
      ) {
        delete nextPatch.mentions;
      }

      const { data, error } = await supabase
        .from("user_privacy_settings")
        .update(nextPatch)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as PrivacySettings;
    },

    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["privacy-settings", user?.id] });

      const prev = qc.getQueryData<PrivacySettings>([
        "privacy-settings",
        user?.id,
      ]);

      if (prev) {
        qc.setQueryData<PrivacySettings>(["privacy-settings", user?.id], {
          ...prev,
          ...patch,
        });
      }

      return { prev };
    },

    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["privacy-settings", user?.id], ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["privacy-settings", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-privacy-settings", user?.id] });
    },
  });

  const settings: PrivacySettings =
    q.data ??
    ({
      user_id: user?.id ?? "",
      ...DEFAULT_PRIVACY_SETTINGS,
      updated_at: new Date().toISOString(),
    } as PrivacySettings);

  return {
    settings,
    isLoading: q.isLoading,
    error: q.error ? String(q.error) : null,
    isSaving: m.isPending,
    update: (patch: Patch) => m.mutate(patch),
  };
}
