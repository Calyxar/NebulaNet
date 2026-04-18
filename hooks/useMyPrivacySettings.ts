// hooks/useMyPrivacySettings.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type UserPrivacySettings,
} from "@/lib/queries/privacy";
import { useQuery } from "@tanstack/react-query";

async function ensurePrivacyRow(userId: string): Promise<UserPrivacySettings> {
  const ref = db.collection("user_privacy_settings").doc(userId);
  const snap = await ref.get();
  if (snap.exists())
    return { user_id: userId, ...snap.data() } as UserPrivacySettings;

  const defaults = { user_id: userId, ...DEFAULT_PRIVACY_SETTINGS };
  await ref.set(defaults, { merge: true });
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