// hooks/useProfilePrivacyFlags.ts — FIREBASE ✅

import { db } from "@/lib/firebase";
import { qk } from "@/lib/queryKeys/social";
import { useQuery } from "@tanstack/react-query";

export type ProfilePrivacyFlags = {
  id: string;
  is_private: boolean;
  hide_followers: boolean;
  hide_following: boolean;
};

export function useProfilePrivacyFlags(profileId?: string) {
  return useQuery({
    queryKey: qk.social.profilePrivacyFlags(profileId),
    enabled: !!profileId,
    queryFn: async () => {
      const snap = await db.collection("profiles").doc(profileId!).get();
      if (!snap.exists) throw new Error("Profile not found");
      const d = snap.data() as any;
      return {
        id: snap.id,
        is_private: d.is_private ?? false,
        hide_followers: d.hide_followers ?? false,
        hide_following: d.hide_following ?? false,
      } as ProfilePrivacyFlags;
    },
  });
}
