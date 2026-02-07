import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type ProfilePrivacyFlags = {
  id: string;
  is_private: boolean;
  hide_followers: boolean;
  hide_following: boolean;
};

export function useProfilePrivacyFlags(profileId?: string) {
  return useQuery({
    queryKey: ["profile-privacy-flags", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,is_private,hide_followers,hide_following")
        .eq("id", profileId!)
        .single();

      if (error) throw error;
      return data as ProfilePrivacyFlags;
    },
  });
}
