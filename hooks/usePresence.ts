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

/**
 * ✅ NEW: formats a lastChanged timestamp into a short "last seen" string,
 * matching the same general style as the timeAgo-style helpers already
 * used elsewhere in the app (home.tsx, chat.tsx). Only meaningful for an
 * OFFLINE user — an online user's header/row should just say "Online",
 * not "Active 0m ago".
 */
export function formatLastSeen(lastChanged: number | null): string {
  if (!lastChanged) return "";
  const diffMs = Date.now() - lastChanged;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Active just now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Active ${diffDays}d ago`;
}
