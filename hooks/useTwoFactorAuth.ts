// hooks/useTwoFactorAuth.ts ✅
import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TwoFactorSettings {
  enabled: boolean;
  phone_number: string | null;
  enrolled_at: string | null;
}

const DEFAULT: TwoFactorSettings = {
  enabled: false,
  phone_number: null,
  enrolled_at: null,
};

export function useTwoFactorStatus() {
  const uid = auth.currentUser?.uid;

  return useQuery<TwoFactorSettings>({
    queryKey: ["two-factor", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return DEFAULT;
      const snap = await db.collection("user_settings").doc(uid).get();
      if (!snap.exists) return DEFAULT;
      const d = snap.data() as any;
      return {
        enabled: !!d.two_factor_enabled,
        phone_number: d.two_factor_phone ?? null,
        enrolled_at: d.two_factor_enrolled_at ?? null,
      };
    },
  });
}

export function useEnableTwoFactor() {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (!uid) throw new Error("Not authenticated");
      await db.collection("user_settings").doc(uid).update({
        two_factor_enabled: true,
        two_factor_phone: phoneNumber,
        two_factor_enrolled_at: new Date().toISOString(),
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["two-factor", uid] });
    },
  });
}

export function useDisableTwoFactor() {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  return useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Not authenticated");
      await db.collection("user_settings").doc(uid).update({
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_enrolled_at: null,
        updated_at_ts: firestore.FieldValue.serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["two-factor", uid] });
    },
  });
}

export async function checkTwoFactorEnabled(uid: string): Promise<{
  enabled: boolean;
  phoneNumber: string | null;
}> {
  try {
    const snap = await db.collection("user_settings").doc(uid).get();
    if (!snap.exists) return { enabled: false, phoneNumber: null };
    const d = snap.data() as any;
    return {
      enabled: !!d.two_factor_enabled,
      phoneNumber: d.two_factor_phone ?? null,
    };
  } catch {
    return { enabled: false, phoneNumber: null };
  }
}
