// hooks/useTwoFactorAuth.ts ✅
// Manual 2FA using Firestore + Firebase Phone Auth
// Stores 2FA config in user_settings document

import { auth, db } from "@/lib/firebase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

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

// ── Read current 2FA status ──────────────────────────────────────────────────
export function useTwoFactorStatus() {
  const uid = auth.currentUser?.uid;

  return useQuery<TwoFactorSettings>({
    queryKey: ["two-factor", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return DEFAULT;
      const snap = await getDoc(doc(db, "user_settings", uid));
      if (!snap.exists()) return DEFAULT;
      const d = snap.data() as any;
      return {
        enabled: !!d.two_factor_enabled,
        phone_number: d.two_factor_phone ?? null,
        enrolled_at: d.two_factor_enrolled_at ?? null,
      };
    },
  });
}

// ── Enable 2FA (call after OTP verified) ─────────────────────────────────────
export function useEnableTwoFactor() {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (!uid) throw new Error("Not authenticated");
      await updateDoc(doc(db, "user_settings", uid), {
        two_factor_enabled: true,
        two_factor_phone: phoneNumber,
        two_factor_enrolled_at: new Date().toISOString(),
        updated_at_ts: serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["two-factor", uid] });
    },
  });
}

// ── Disable 2FA ───────────────────────────────────────────────────────────────
export function useDisableTwoFactor() {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  return useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Not authenticated");
      await updateDoc(doc(db, "user_settings", uid), {
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_enrolled_at: null,
        updated_at_ts: serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["two-factor", uid] });
    },
  });
}

// ── Check if a user has 2FA enabled (used during login) ──────────────────────
export async function checkTwoFactorEnabled(uid: string): Promise<{
  enabled: boolean;
  phoneNumber: string | null;
}> {
  try {
    const snap = await getDoc(doc(db, "user_settings", uid));
    if (!snap.exists()) return { enabled: false, phoneNumber: null };
    const d = snap.data() as any;
    return {
      enabled: !!d.two_factor_enabled,
      phoneNumber: d.two_factor_phone ?? null,
    };
  } catch {
    return { enabled: false, phoneNumber: null };
  }
}
