// hooks/useProfileByUsername.ts — FIREBASE ✅

import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

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
      const snap = await getDocs(
        query(
          collection(db, "profiles"),
          where("username", "==", username!),
          limit(1),
        ),
      );
      if (snap.empty) throw new Error("Profile not found");
      const d = snap.docs[0].data() as any;
      return {
        id: snap.docs[0].id,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
        is_private: d.is_private ?? false,
        hide_followers: d.hide_followers ?? false,
        hide_following: d.hide_following ?? false,
      } as PublicProfile;
    },
  });
}
