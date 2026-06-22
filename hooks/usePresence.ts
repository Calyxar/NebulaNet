// hooks/usePresence.ts — FIREBASE ✅
// Read-only subscriber to a user's online/offline status, written by
// lib/firestore/presence.ts (initPresence/teardownPresence) into
// Realtime Database at /status/{uid}.
//
// This hook does NOT set the current user's own status — it only
// reads someone else's (or your own, if you pass your own uid).
// Writing presence happens once, centrally, via initPresence() in
// AuthProvider — not per-component.

import database from "@react-native-firebase/database";
import { useEffect, useState } from "react";

export type PresenceState = "online" | "offline" | "unknown";

export interface PresenceInfo {
  status: PresenceState;
  lastChanged: number | null;
}

export function usePresence(userId?: string | null): PresenceInfo {
  const [info, setInfo] = useState<PresenceInfo>({
    status: "unknown",
    lastChanged: null,
  });

  useEffect(() => {
    if (!userId) {
      setInfo({ status: "unknown", lastChanged: null });
      return;
    }

    const ref = database().ref(`/status/${userId}`);

    const callback = ref.on(
      "value",
      (snap) => {
        const val = snap.val();
        if (!val) {
          setInfo({ status: "unknown", lastChanged: null });
          return;
        }
        setInfo({
          status: val.state === "online" ? "online" : "offline",
          lastChanged: val.last_changed ?? null,
        });
      },
      (err) => {
        console.warn("usePresence: listener error", err);
        setInfo({ status: "unknown", lastChanged: null });
      },
    );

    return () => ref.off("value", callback);
  }, [userId]);

  return info;
}
