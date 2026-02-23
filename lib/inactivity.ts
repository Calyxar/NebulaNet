// lib/inactivity.ts — FIREBASE ✅

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { AppState, type AppStateStatus } from "react-native";

const LAST_ACTIVE_KEY = "nebulanet:last_active_ms";
const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let currentState: AppStateStatus = AppState.currentState;

async function saveLastActiveNow() {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {}
}

async function getLastActiveMs(): Promise<number | null> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const v = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function checkAndLogoutIfInactive() {
  const last = await getLastActiveMs();
  if (!last) return;
  if (Date.now() - last >= INACTIVITY_LIMIT_MS) {
    await signOut(auth);
  }
}

export function startInactivityWatcher() {
  saveLastActiveNow();

  const sub = AppState.addEventListener("change", async (nextState) => {
    if (currentState === "active" && nextState.match(/inactive|background/)) {
      await saveLastActiveNow();
    }
    if (currentState.match(/inactive|background/) && nextState === "active") {
      await checkAndLogoutIfInactive();
      await saveLastActiveNow();
    }
    currentState = nextState;
  });

  return () => sub.remove();
}
