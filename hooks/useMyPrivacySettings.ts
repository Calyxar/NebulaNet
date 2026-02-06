// hooks/useMyPrivacySettings.ts
import { useAuth } from "@/hooks/useAuth";
import {
    DEFAULT_PRIVACY_SETTINGS,
    type UserPrivacySettings,
} from "@/lib/queries/privacy";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

async function ensurePrivacyRow(userId: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as UserPrivacySettings;

  const { data: created, error: insertError } = await supabase
    .from("user_privacy_settings")
    .insert({
      user_id: userId,
      ...DEFAULT_PRIVACY_SETTINGS,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as UserPrivacySettings;
}

export function useMyPrivacySettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-privacy-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      return ensurePrivacyRow(user.id);
    },
  });
}
