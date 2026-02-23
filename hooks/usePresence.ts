// hooks/usePresence.ts — FIREBASE ✅

import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

export type PresenceStatus = "online" | "offline" | "away";

export function usePresence(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const setStatus = async (status: PresenceStatus) => {
      if (!mounted) return;
      await setDoc(
        doc(db, "user_presence", userId),
        { user_id: userId, status, last_seen: serverTimestamp() },
        { merge: true },
      );
    };

    setStatus("online").catch(() => {});

    const onAppStateChange = (state: AppStateStatus) => {
      setStatus(state === "active" ? "online" : "away").catch(() => {});
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      mounted = false;
      sub.remove();
      setStatus("offline").catch(() => {});
    };
  }, [userId]);
}
