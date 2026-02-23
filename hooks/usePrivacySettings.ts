// hooks/usePrivacySettings.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
    DEFAULT_PRIVACY_SETTINGS,
    isPrivacySelect,
    type PrivacySettings,
} from "@/lib/firestore/privacy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

type Patch = Partial<Omit<PrivacySettings, "user_id" | "updated_at">>;

async function ensurePrivacyRow(userId: string): Promise<PrivacySettings> {
  const ref = doc(db, "user_privacy_settings", userId);
  const snap = await getDoc(ref);
  if (snap.exists())
    return { user_id: userId, ...snap.data() } as PrivacySettings;

  const defaults = {
    user_id: userId,
    ...DEFAULT_PRIVACY_SETTINGS,
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, defaults, { merge: true });
  return defaults as PrivacySettings;
}

export function usePrivacySettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["privacy-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      return ensurePrivacyRow(user.uid);
    },
  });

  const m = useMutation({
    mutationFn: async (patch: Patch) => {
      if (!user?.id) throw new Error("Not signed in");

      const nextPatch: Patch = { ...patch };
      if (
        "who_can_comment" in nextPatch &&
        nextPatch.who_can_comment !== undefined &&
        !isPrivacySelect(nextPatch.who_can_comment)
      )
        delete nextPatch.who_can_comment;
      if (
        "who_can_message" in nextPatch &&
        nextPatch.who_can_message !== undefined &&
        !isPrivacySelect(nextPatch.who_can_message)
      )
        delete nextPatch.who_can_message;
      if (
        "mentions" in nextPatch &&
        nextPatch.mentions !== undefined &&
        !isPrivacySelect(nextPatch.mentions)
      )
        delete nextPatch.mentions;

      const ref = doc(db, "user_privacy_settings", user.uid);
      await updateDoc(ref, {
        ...nextPatch,
        updated_at: new Date().toISOString(),
      });
      const snap = await getDoc(ref);
      return { user_id: user.uid, ...snap.data() } as PrivacySettings;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["privacy-settings", user?.id] });
      const prev = qc.getQueryData<PrivacySettings>([
        "privacy-settings",
        user?.id,
      ]);
      if (prev)
        qc.setQueryData<PrivacySettings>(["privacy-settings", user?.id], {
          ...prev,
          ...patch,
        });
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
