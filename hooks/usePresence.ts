// hooks/usePresence.ts — UPDATED (no implicit any, safe types)

import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

export type PresenceStatus = "online" | "offline" | "away";

export function usePresence(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const setStatus = async (status: PresenceStatus) => {
      if (!mounted) return;

      // expects: user_presence(user_id uuid primary key, status text, last_seen timestamptz)
      await supabase.from("user_presence").upsert(
        {
          user_id: userId,
          status,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    // initial
    setStatus("online").catch(() => {});

    // app foreground/background
    const onAppStateChange = (state: AppStateStatus) => {
      const next: PresenceStatus = state === "active" ? "online" : "away";
      setStatus(next).catch(() => {});
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      mounted = false;
      sub.remove();

      // best-effort offline
      setStatus("offline").catch(() => {});
    };
  }, [userId]);
}
