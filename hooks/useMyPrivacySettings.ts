// hooks/useMyPrivacySettings.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
    DEFAULT_PRIVACY_SETTINGS,
    type UserPrivacySettings,
} from "@/lib/firestore/privacy";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";

async function ensurePrivacyRow(userId: string): Promise<UserPrivacySettings> {
  const ref = doc(db, "user_privacy_settings", userId);
  const snap = await getDoc(ref);
  if (snap.exists())
    return { user_id: userId, ...snap.data() } as UserPrivacySettings;

  const defaults = { user_id: userId, ...DEFAULT_PRIVACY_SETTINGS };
  await setDoc(ref, defaults, { merge: true });
  return defaults as UserPrivacySettings;
}

export function useMyPrivacySettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-privacy-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      return ensurePrivacyRow(user.uid);
    },
  });
}
