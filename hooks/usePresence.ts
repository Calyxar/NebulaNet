// hooks/usePresence.ts — FIREBASE ✅

import { db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

export type PresenceStatus = "online" | "offline" | "away";

export function usePresence(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const setStatus = async (status: PresenceStatus) => {
      if (!mounted) return;
      await db
        .collection("user_presence")
        .doc(userId)
        .set(
          {
            user_id: userId,
            status,
            last_seen: firestore.FieldValue.serverTimestamp(),
          },
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
