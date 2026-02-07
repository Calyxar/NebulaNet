import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type PublicProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  hide_followers: boolean;
  hide_following: boolean;
};

export function useProfileByUsername(username?: string) {
  return useQuery({
    queryKey: ["profile-by-username", username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,username,full_name,avatar_url,is_private,hide_followers,hide_following",
        )
        .eq("username", username!)
        .single();

      if (error) throw error;
      return data as PublicProfile;
    },
  });
}
